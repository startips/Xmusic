package cn.toside.music.mobile.player.cache

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.common.util.Util
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.extractor.DefaultExtractorsFactory
import java.io.File

/**
 * Manages Media3 SimpleCache at files/TrackPlayer (preserving legacy cache compatibility)
 * and constructs MediaSource instances for remote HTTP and local file/content URIs.
 */
@UnstableApi
object PlayerMediaCache {
  private const val TAG = "PlayerMediaCache"
  private const val CACHE_DIR_NAME = "TrackPlayer"

  private val lock = Any()
  private var cache: SimpleCache? = null
  private var maxCacheBytes: Long = 0L

  fun init(context: Context, maxBytes: Long) {
    synchronized(lock) {
      if (maxBytes <= 0L) {
        maxCacheBytes = 0L
        releaseLocked()
        return
      }
      if (cache != null && maxCacheBytes == maxBytes) {
        return
      }
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

  fun isCached(url: String): Boolean {
    synchronized(lock) {
      val c = cache ?: return false
      return try {
        c.getCachedSpans(url).isNotEmpty()
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

  fun buildMediaSource(
    context: Context,
    uri: Uri,
    userAgent: String?,
    headers: Map<String, String>?,
  ): MediaSource {
    val dsFactory: DataSource.Factory = if (isLocalUri(uri)) {
      DefaultDataSource.Factory(context)
    } else {
      val ua = if (!userAgent.isNullOrEmpty()) userAgent else Util.getUserAgent(context, "Xmusic")
      val httpFactory = DefaultHttpDataSource.Factory()
        .setUserAgent(ua)
        .setConnectTimeoutMs(DefaultHttpDataSource.DEFAULT_CONNECT_TIMEOUT_MILLIS)
        .setReadTimeoutMs(DefaultHttpDataSource.DEFAULT_READ_TIMEOUT_MILLIS)
        .setAllowCrossProtocolRedirects(true)
      if (!headers.isNullOrEmpty()) {
        httpFactory.setDefaultRequestProperties(headers)
      }
      val activeCache = synchronized(lock) { if (maxCacheBytes > 0L) cache else null }
      if (activeCache != null) {
        CacheDataSource.Factory()
          .setCache(activeCache)
          .setUpstreamDataSourceFactory(httpFactory)
          .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
      } else {
        httpFactory
      }
    }

    val extractorsFactory = DefaultExtractorsFactory().setConstantBitrateSeekingEnabled(true)
    return ProgressiveMediaSource.Factory(dsFactory, extractorsFactory)
      .createMediaSource(MediaItem.fromUri(uri))
  }
}
