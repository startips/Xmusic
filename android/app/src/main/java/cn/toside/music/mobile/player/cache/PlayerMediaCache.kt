package cn.toside.music.mobile.player.cache

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.common.util.Util
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSink
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.CacheWriter
import androidx.media3.datasource.cache.ContentMetadata
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.extractor.DefaultExtractorsFactory
import java.io.File
import java.io.InterruptedIOException
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.min

/**
 * Manages Media3 SimpleCache at files/TrackPlayer (preserving legacy cache compatibility),
 * builds cached/local MediaSource instances, and drives low-priority background full-track
 * and next-track audio prefetching via CacheWriter.
 */
@UnstableApi
object PlayerMediaCache {
  private const val TAG = "PlayerMediaCache"
  private const val CACHE_DIR_NAME = "TrackPlayer"
  private const val CONNECT_TIMEOUT_MS = 12_000
  private const val READ_TIMEOUT_MS = 15_000
  private const val DEFAULT_NEXT_PREFETCH_BYTES = 4L * 1024L * 1024L
  private const val MAX_SINGLE_TRACK_CACHE_BYTES = 150L * 1024L * 1024L
  private const val CACHE_WRITER_BUF_BYTES = 64 * 1024

  private class PrefetchHandle {
    val cancelled = AtomicBoolean(false)
    @Volatile
    var writer: CacheWriter? = null

    fun cancel() {
      if (cancelled.compareAndSet(false, true)) {
        try {
          writer?.cancel()
        } catch (_: Exception) {}
      }
    }
  }

  private val lock = Any()
  private var cache: SimpleCache? = null
  private var maxCacheBytes: Long = 0L

  private val prefetchExecutor = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "XmusicCachePrefetch").apply {
      priority = Thread.MIN_PRIORITY
      isDaemon = true
    }
  }
  private val currentJobSeq = AtomicInteger(0)
  private val nextJobSeq = AtomicInteger(0)
  @Volatile
  private var currentTrackJob: PrefetchHandle? = null
  @Volatile
  private var nextTrackJob: PrefetchHandle? = null

  fun init(context: Context, maxBytes: Long) {
    synchronized(lock) {
      if (maxBytes <= 0L) {
        maxCacheBytes = 0L
        cancelAllPrefetch()
        releaseLocked()
        return
      }
      if (cache != null && maxCacheBytes == maxBytes) {
        return
      }
      cancelAllPrefetch()
      releaseLocked()
      maxCacheBytes = maxBytes
      val cacheDir = File(context.filesDir, CACHE_DIR_NAME)
      cache = createSimpleCacheSafely(context.applicationContext, cacheDir, maxBytes)
    }
  }

  private fun createSimpleCacheSafely(
    appContext: Context,
    cacheDir: File,
    maxBytes: Long,
  ): SimpleCache? {
    return try {
      if (!cacheDir.exists()) cacheDir.mkdirs()
      SimpleCache(
        cacheDir,
        LeastRecentlyUsedCacheEvictor(maxBytes),
        StandaloneDatabaseProvider(appContext),
      )
    } catch (e: Exception) {
      Log.w(TAG, "SimpleCache init failed, resetting cache dir", e)
      try {
        cacheDir.deleteRecursively()
        cacheDir.mkdirs()
        SimpleCache(
          cacheDir,
          LeastRecentlyUsedCacheEvictor(maxBytes),
          StandaloneDatabaseProvider(appContext),
        )
      } catch (retryEx: Exception) {
        Log.e(TAG, "SimpleCache recovery failed", retryEx)
        null
      }
    }
  }

  fun isCached(keyOrUrl: String): Boolean {
    synchronized(lock) {
      val c = cache ?: return false
      return try {
        c.getCachedSpans(keyOrUrl).isNotEmpty()
      } catch (_: Exception) {
        false
      }
    }
  }

  fun getCacheSizeBytes(): Double {
    synchronized(lock) {
      return (cache?.cacheSpace ?: 0L).toDouble()
    }
  }

  fun clearCache() {
    cancelAllPrefetch()
    synchronized(lock) {
      val c = cache ?: return
      val keys = try {
        c.keys.toList()
      } catch (_: Exception) {
        emptyList()
      }
      for (key in keys) {
        try {
          c.removeResource(key)
        } catch (e: Exception) {
          Log.w(TAG, "Failed to remove cached key: $key", e)
        }
      }
    }
  }

  fun release() {
    cancelAllPrefetch()
    synchronized(lock) {
      releaseLocked()
    }
  }

  private fun releaseLocked() {
    try {
      cache?.release()
    } catch (e: Exception) {
      Log.w(TAG, "Failed to release SimpleCache", e)
    } finally {
      cache = null
    }
  }

  fun isLocalUri(uri: Uri?): Boolean {
    if (uri == null) return false
    val scheme = uri.scheme
    val host = uri.host
    return scheme == null ||
      scheme == ContentResolver.SCHEME_FILE ||
      scheme == ContentResolver.SCHEME_ANDROID_RESOURCE ||
      scheme == ContentResolver.SCHEME_CONTENT ||
      scheme == "res" ||
      host == null ||
      host == "localhost" ||
      host == "127.0.0.1" ||
      host == "[::1]"
  }

  private fun buildHttpDataSourceFactory(
    context: Context,
    userAgent: String?,
    headers: Map<String, String>?,
  ): DefaultHttpDataSource.Factory {
    val ua = if (!userAgent.isNullOrEmpty()) userAgent else Util.getUserAgent(context, "Xmusic")
    val httpFactory = DefaultHttpDataSource.Factory()
      .setUserAgent(ua)
      .setConnectTimeoutMs(CONNECT_TIMEOUT_MS)
      .setReadTimeoutMs(READ_TIMEOUT_MS)
      .setAllowCrossProtocolRedirects(true)
    if (!headers.isNullOrEmpty()) {
      httpFactory.setDefaultRequestProperties(headers)
    }
    return httpFactory
  }

  private fun buildCacheDataSourceFactory(
    activeCache: SimpleCache,
    context: Context,
    userAgent: String?,
    headers: Map<String, String>?,
  ): CacheDataSource.Factory {
    val httpFactory = buildHttpDataSourceFactory(context, userAgent, headers)
    val sinkFactory = CacheDataSink.Factory()
      .setCache(activeCache)
      .setFragmentSize(CacheDataSink.DEFAULT_FRAGMENT_SIZE)
    return CacheDataSource.Factory()
      .setCache(activeCache)
      .setUpstreamDataSourceFactory(httpFactory)
      .setCacheWriteDataSinkFactory(sinkFactory)
      .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
  }

  fun buildMediaSource(
    context: Context,
    uri: Uri,
    userAgent: String?,
    headers: Map<String, String>?,
    cacheKey: String? = null,
  ): MediaSource {
    val isLocal = isLocalUri(uri)
    val dsFactory: DataSource.Factory = if (isLocal) {
      DefaultDataSource.Factory(context)
    } else {
      val activeCache = synchronized(lock) { if (maxCacheBytes > 0L) cache else null }
      if (activeCache != null) {
        buildCacheDataSourceFactory(activeCache, context, userAgent, headers)
      } else {
        buildHttpDataSourceFactory(context, userAgent, headers)
      }
    }

    val mediaItemBuilder = MediaItem.Builder().setUri(uri)
    if (!isLocal && !cacheKey.isNullOrBlank()) {
      mediaItemBuilder.setCustomCacheKey(cacheKey)
    }
    val extractorsFactory = DefaultExtractorsFactory().setConstantBitrateSeekingEnabled(true)
    return ProgressiveMediaSource.Factory(dsFactory, extractorsFactory)
      .createMediaSource(mediaItemBuilder.build())
  }

  fun cancelCurrentTrackPrefetch() {
    currentJobSeq.incrementAndGet()
    currentTrackJob?.cancel()
    currentTrackJob = null
  }

  fun cancelNextTrackPrefetch() {
    nextJobSeq.incrementAndGet()
    nextTrackJob?.cancel()
    nextTrackJob = null
  }

  fun cancelAllPrefetch() {
    cancelCurrentTrackPrefetch()
    cancelNextTrackPrefetch()
  }

  /**
   * Downloads remaining uncached spans of the currently playing remote track into SimpleCache
   * on a low-priority background thread so high-bitrate FLAC/Hi-Res playback never stalls at
   * ExoPlayer's RAM buffer cap.
   */
  fun prefetchFullTrack(
    context: Context,
    url: String,
    userAgent: String?,
    headers: Map<String, String>?,
    cacheKey: String?,
  ) {
    val appCtx = context.applicationContext
    val uri = Uri.parse(url)
    if (isLocalUri(uri)) return

    val activeCache: SimpleCache
    val maxTrackBytes: Long
    synchronized(lock) {
      if (maxCacheBytes <= 0L) return
      activeCache = cache ?: return
      maxTrackBytes = min(maxCacheBytes / 2L, MAX_SINGLE_TRACK_CACHE_BYTES)
    }
    if (maxTrackBytes <= 0L) return

    val key = cacheKey?.takeIf { it.isNotBlank() } ?: url
    val seq = currentJobSeq.incrementAndGet()
    currentTrackJob?.cancel()
    val handle = PrefetchHandle()
    currentTrackJob = handle

    prefetchExecutor.execute {
      if (handle.cancelled.get() || seq != currentJobSeq.get()) return@execute
      runCacheWriter(
        appContext = appCtx,
        activeCache = activeCache,
        uri = uri,
        key = key,
        userAgent = userAgent,
        headers = headers,
        targetLength = C.LENGTH_UNSET.toLong(),
        maxBudgetBytes = maxTrackBytes,
        handle = handle,
        isStillActive = { !handle.cancelled.get() && seq == currentJobSeq.get() },
      )
    }
  }

  /**
   * Pre-caches the leading bytes (default 4 MiB) of the upcoming track into SimpleCache
   * for instant track transitions.
   */
  fun prefetchNextTrack(
    context: Context,
    url: String,
    userAgent: String?,
    headers: Map<String, String>?,
    cacheKey: String?,
    maxBytes: Long = DEFAULT_NEXT_PREFETCH_BYTES,
  ) {
    val appCtx = context.applicationContext
    val uri = Uri.parse(url)
    if (isLocalUri(uri)) return

    val activeCache: SimpleCache
    val budget: Long
    synchronized(lock) {
      if (maxCacheBytes <= 0L) return
      activeCache = cache ?: return
      budget = min(maxBytes.coerceIn(512L * 1024L, 12L * 1024L * 1024L), maxCacheBytes / 4L)
    }
    if (budget <= 0L) return

    val key = cacheKey?.takeIf { it.isNotBlank() } ?: url
    val seq = nextJobSeq.incrementAndGet()
    nextTrackJob?.cancel()
    val handle = PrefetchHandle()
    nextTrackJob = handle

    prefetchExecutor.execute {
      if (handle.cancelled.get() || seq != nextJobSeq.get()) return@execute
      runCacheWriter(
        appContext = appCtx,
        activeCache = activeCache,
        uri = uri,
        key = key,
        userAgent = userAgent,
        headers = headers,
        targetLength = budget,
        maxBudgetBytes = budget,
        handle = handle,
        isStillActive = { !handle.cancelled.get() && seq == nextJobSeq.get() },
      )
    }
  }

  private fun runCacheWriter(
    appContext: Context,
    activeCache: SimpleCache,
    uri: Uri,
    key: String,
    userAgent: String?,
    headers: Map<String, String>?,
    targetLength: Long,
    maxBudgetBytes: Long,
    handle: PrefetchHandle,
    isStillActive: () -> Boolean,
  ) {
    try {
      synchronized(lock) {
        if (cache !== activeCache || !isStillActive()) return
      }
      val knownLength = try {
        ContentMetadata.getContentLength(activeCache.getContentMetadata(key))
      } catch (_: Exception) {
        C.LENGTH_UNSET.toLong()
      }
      if (knownLength > 0L) {
        if (knownLength > maxBudgetBytes && targetLength == C.LENGTH_UNSET.toLong()) {
          return
        }
        val checkLen = if (targetLength > 0L) min(knownLength, targetLength) else knownLength
        val alreadyCached = try {
          activeCache.getCachedBytes(key, 0L, checkLen)
        } catch (_: Exception) {
          0L
        }
        if (alreadyCached >= checkLen) return
      }

      val specLength = if (targetLength > 0L) {
        if (knownLength > 0L) min(knownLength, targetLength) else targetLength
      } else {
        C.LENGTH_UNSET.toLong()
      }

      val ds = buildCacheDataSourceFactory(activeCache, appContext, userAgent, headers)
        .createDataSourceForDownloading()
      val dataSpec = DataSpec.Builder()
        .setUri(uri)
        .setPosition(0L)
        .setLength(specLength)
        .setKey(key)
        .build()
      val writer = CacheWriter(
        ds,
        dataSpec,
        ByteArray(CACHE_WRITER_BUF_BYTES),
      ) { _, bytesCached, _ ->
        if (!isStillActive() || bytesCached > maxBudgetBytes) {
          handle.cancel()
          throw InterruptedIOException("Prefetch cancelled or over budget")
        }
      }
      handle.writer = writer
      if (!isStillActive()) return
      writer.cache()
    } catch (_: InterruptedIOException) {
    } catch (_: InterruptedException) {
    } catch (e: Exception) {
      if (isStillActive()) {
        Log.d(TAG, "Background prefetch skipped/incomplete for $key: ${e.message}")
      }
    } finally {
      handle.writer = null
    }
  }
}
