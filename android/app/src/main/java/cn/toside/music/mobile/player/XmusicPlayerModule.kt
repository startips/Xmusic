package cn.toside.music.mobile.player

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.content.ContextCompat
import androidx.media3.common.util.UnstableApi
import cn.toside.music.mobile.core.getBooleanOrDefault
import cn.toside.music.mobile.core.getDoubleOrDefault
import cn.toside.music.mobile.core.getIntOrDefault
import cn.toside.music.mobile.core.getStringOrNull
import cn.toside.music.mobile.player.cache.PlayerMediaCache
import cn.toside.music.mobile.player.session.NowPlayingTrackMetadata
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.util.ArrayDeque

@UnstableApi
class XmusicPlayerModule(
  private val reactAppContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactAppContext), ServiceConnection {

  private var binder: XmusicPlaybackService.LocalBinder? = null
  private var connecting: Boolean = false
  private val pendingActions = ArrayDeque<() -> Unit>()

  private var favoriteState: Boolean = false
  private var softPlayPause: Boolean = true
  private var crossfadeMs: Int = 2000
  private var stopWithApp: Boolean = true
  private var listenerCount: Int = 0

  init {
    XmusicPlayerEventBus.attach(reactAppContext)
  }

  override fun getName(): String = "XmusicPlayerModule"

  override fun getConstants(): Map<String, Any> = mapOf(
    "STATE_NONE" to PlaybackStateCompat.STATE_NONE,
    "STATE_STOPPED" to PlaybackStateCompat.STATE_STOPPED,
    "STATE_PAUSED" to PlaybackStateCompat.STATE_PAUSED,
    "STATE_PLAYING" to PlaybackStateCompat.STATE_PLAYING,
    "STATE_BUFFERING" to PlaybackStateCompat.STATE_BUFFERING,
    "STATE_CONNECTING" to PlaybackStateCompat.STATE_CONNECTING,
  )

  override fun invalidate() {
    XmusicPlayerEventBus.detach(reactAppContext)
    if (binder != null) {
      try {
        reactAppContext.unbindService(this)
      } catch (_: Exception) {}
      binder = null
    }
    connecting = false
    pendingActions.clear()
    super.invalidate()
  }

  @ReactMethod
  fun addListener(eventName: String) {
    listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = (listenerCount - count).coerceAtLeast(0)
  }

  private fun waitForConnection(action: () -> Unit) {
    val activeBinder = binder
    if (activeBinder != null) {
      activeBinder.post(action)
      return
    }
    pendingActions.addLast(action)
    if (connecting) return
    connecting = true
    val intent = Intent(reactAppContext, XmusicPlaybackService::class.java)
    try {
      ContextCompat.startForegroundService(reactAppContext, intent)
    } catch (_: Exception) {
      try {
        reactAppContext.startService(intent)
      } catch (_: Exception) {}
    }
    reactAppContext.bindService(intent, this, Context.BIND_AUTO_CREATE)
  }

  override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
    val localBinder = service as? XmusicPlaybackService.LocalBinder ?: return
    binder = localBinder
    connecting = false

    localBinder.post {
      val ctrl = localBinder.controller
      ctrl.setStopWithApp(stopWithApp)
      ctrl.setFavoriteState(favoriteState)
      ctrl.setAudioTransitionConfig(softPlayPause, crossfadeMs)
      while (pendingActions.isNotEmpty()) {
        pendingActions.removeFirst().invoke()
      }
    }
  }

  override fun onServiceDisconnected(name: ComponentName?) {
    binder = null
    connecting = false
  }

  @ReactMethod
  fun setupPlayer(options: ReadableMap?, promise: Promise) {
    val maxCacheSizeKb = options.getDoubleOrDefault("maxCacheSize", 0.0).toLong()
    val maxBufferSec = options.getDoubleOrDefault("maxBuffer", 50.0)
    val handleAudioFocus = options.getBooleanOrDefault("handleAudioFocus", true)
    val audioOffload = options.getBooleanOrDefault("audioOffload", true)
    val autoUpdateMetadata = options.getBooleanOrDefault("autoUpdateMetadata", false)

    waitForConnection {
      binder?.controller?.setupPlayer(
        maxCacheSizeKb = maxCacheSizeKb,
        maxBufferSec = maxBufferSec,
        handleAudioFocus = handleAudioFocus,
        audioOffload = audioOffload,
        autoUpdateMetadata = autoUpdateMetadata,
      )
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun updateOptions(options: ReadableMap?, promise: Promise) {
    val stop = options.getBooleanOrDefault("stopWithApp", true)
    this.stopWithApp = stop
    val b = binder
    if (b != null) {
      b.post {
        b.controller.setStopWithApp(stop)
        promise.resolve(null)
      }
    } else {
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun loadTrack(track: ReadableMap?, startTimeSec: Double, autoPlay: Boolean, promise: Promise) {
    val url = track.getStringOrNull("url")
    if (url.isNullOrBlank()) {
      promise.reject("ERR_INVALID_URL", "Track url is empty")
      return
    }
    val userAgent = track.getStringOrNull("userAgent")
    val durationSec = track.getDoubleOrDefault("duration", 0.0)
    val headersMap = extractStringMap(track?.getMap("headers"))

    waitForConnection {
      binder?.controller?.loadTrack(
        url = url,
        userAgent = userAgent,
        headers = headersMap,
        durationSec = durationSec,
        startTimeSec = startTimeSec,
        autoPlay = autoPlay,
      )
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun play(promise: Promise) {
    waitForConnection {
      binder?.controller?.play()
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun pause(promise: Promise) {
    val b = binder
    if (b == null) {
      promise.resolve(null)
      return
    }
    b.post {
      b.controller.pause()
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    val b = binder
    if (b == null) {
      promise.resolve(null)
      return
    }
    b.post {
      b.controller.stop()
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun seekTo(seconds: Double, promise: Promise) {
    waitForConnection {
      binder?.controller?.seekTo(seconds)
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun setVolume(volume: Double, promise: Promise) {
    waitForConnection {
      binder?.controller?.setVolume(volume.toFloat())
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun setRate(rate: Double, promise: Promise) {
    waitForConnection {
      binder?.controller?.setRate(rate.toFloat())
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun updateNowPlayingMetadata(
    metadata: ReadableMap?,
    isPlaying: Boolean,
    promise: Promise,
  ) {
    val title = metadata.getStringOrNull("title") ?: "Unknown"
    val artist = metadata.getStringOrNull("artist") ?: "Unknown"
    val album = metadata.getStringOrNull("album")
    val artwork = metadata.getStringOrNull("artwork")
    val durationSec = metadata.getDoubleOrDefault("duration", 0.0)
    val lyric = metadata.getStringOrNull("lyric")

    waitForConnection {
      binder?.controller?.updateMetadata(
        NowPlayingTrackMetadata(
          title = title,
          artist = artist,
          album = album,
          artwork = artwork,
          durationMs = if (durationSec > 0.0) (durationSec * 1000.0).toLong() else 0L,
          lyric = lyric,
        ),
        isPlayingOverride = isPlaying,
      )
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun updateNowPlayingTitles(map: ReadableMap?, promise: Promise) {
    val b = binder
    if (b == null) {
      promise.resolve(null)
      return
    }
    val title = map.getStringOrNull("title")
    val artist = map.getStringOrNull("artist")
    val album = map.getStringOrNull("album")
    val lyric = map.getStringOrNull("lyric")
    b.post {
      b.controller.updateTitles(title, artist, album, lyric)
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun setFavoriteState(favorite: Boolean, promise: Promise) {
    favoriteState = favorite
    val b = binder
    if (b != null) {
      b.post {
        b.controller.setFavoriteState(favorite)
        promise.resolve(null)
      }
    } else {
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun setAudioTransitionConfig(softPlayPause: Boolean, crossfadeMs: Int, promise: Promise) {
    this.softPlayPause = softPlayPause
    this.crossfadeMs = crossfadeMs
    val b = binder
    if (b != null) {
      b.post {
        b.controller.setAudioTransitionConfig(softPlayPause, crossfadeMs)
        promise.resolve(null)
      }
    } else {
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun getAudioSessionId(promise: Promise) {
    val b = binder
    if (b == null) {
      promise.resolve(0)
      return
    }
    b.post {
      promise.resolve(b.controller.getAudioSessionId())
    }
  }

  @ReactMethod
  fun getState(promise: Promise) {
    val b = binder
    if (b == null) {
      promise.resolve(PlaybackStateCompat.STATE_NONE)
      return
    }
    b.post {
      promise.resolve(b.controller.getState())
    }
  }

  @ReactMethod
  fun getPosition(promise: Promise) {
    val b = binder
    if (b == null) {
      promise.resolve(0.0)
      return
    }
    b.post {
      promise.resolve(b.controller.getPositionSec())
    }
  }

  @ReactMethod
  fun getDuration(promise: Promise) {
    val b = binder
    if (b == null) {
      promise.resolve(0.0)
      return
    }
    b.post {
      promise.resolve(b.controller.getDurationSec())
    }
  }

  @ReactMethod
  fun getBufferedPosition(promise: Promise) {
    val b = binder
    if (b == null) {
      promise.resolve(0.0)
      return
    }
    b.post {
      promise.resolve(b.controller.getBufferedPositionSec())
    }
  }

  @ReactMethod
  fun getPlaybackSnapshot(promise: Promise) {
    val b = binder
    if (b == null) {
      val empty = Arguments.createMap().apply {
        putInt("state", PlaybackStateCompat.STATE_NONE)
        putDouble("position", 0.0)
        putDouble("duration", 0.0)
        putDouble("buffered", 0.0)
      }
      promise.resolve(empty)
      return
    }
    b.post {
      val ctrl = b.controller
      val map = Arguments.createMap().apply {
        putInt("state", ctrl.getState())
        putDouble("position", ctrl.getPositionSec())
        putDouble("duration", ctrl.getDurationSec())
        putDouble("buffered", ctrl.getBufferedPositionSec())
      }
      promise.resolve(map)
    }
  }

  @ReactMethod
  fun isCached(url: String?, promise: Promise) {
    if (url.isNullOrBlank()) {
      promise.resolve(false)
      return
    }
    promise.resolve(PlayerMediaCache.isCached(url))
  }

  @ReactMethod
  fun getCacheSize(promise: Promise) {
    promise.resolve(PlayerMediaCache.getCacheSizeBytes())
  }

  @ReactMethod
  fun clearCache(promise: Promise) {
    PlayerMediaCache.clearCache()
    promise.resolve(null)
  }

  @ReactMethod
  fun destroy(promise: Promise) {
    val b = binder
    if (b != null) {
      b.post {
        b.controller.stop()
        b.controller.destroy()
        try {
          reactAppContext.unbindService(this)
        } catch (_: Exception) {}
        binder = null
        try {
          reactAppContext.stopService(Intent(reactAppContext, XmusicPlaybackService::class.java))
        } catch (_: Exception) {}
        promise.resolve(null)
      }
    } else {
      promise.resolve(null)
    }
  }

  private fun extractStringMap(map: ReadableMap?): Map<String, String>? {
    if (map == null) return null
    val iter = map.keySetIterator()
    if (!iter.hasNextKey()) return null
    val result = HashMap<String, String>()
    while (iter.hasNextKey()) {
      val k = iter.nextKey()
      val v = map.getStringOrNull(k)
      if (v != null) result[k] = v
    }
    return result.ifEmpty { null }
  }
}
