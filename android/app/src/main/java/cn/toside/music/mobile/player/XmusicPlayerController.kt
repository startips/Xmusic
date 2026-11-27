package cn.toside.music.mobile.player

import android.annotation.SuppressLint
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.support.v4.media.session.PlaybackStateCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.HttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlaybackException
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import cn.toside.music.mobile.player.cache.PlayerMediaCache
import cn.toside.music.mobile.player.dsp.XmusicDspAudioProcessor
import cn.toside.music.mobile.player.session.NowPlayingTrackMetadata
import cn.toside.music.mobile.player.session.PlaybackSnapshotForSession
import cn.toside.music.mobile.player.session.XmusicMediaNotificationManager
import kotlin.math.max
import kotlin.math.min

/**
 * Main-thread Media3 ExoPlayer controller with 60fps soft play/pause envelope,
 * track-end crossfade attenuation, WakeLock/WifiLock, and session/notification sync.
 */
@UnstableApi
class XmusicPlayerController(
  private val service: Service,
) : Player.Listener {

  companion object {
    private const val ACTION_AUDIO_SESSION_CHANGED = "com.startips.xmusic.AUDIO_SESSION_CHANGED"
  }

  val notificationManager: XmusicMediaNotificationManager =
    XmusicMediaNotificationManager(service) { buildSessionSnapshot() }

  private val mainHandler = Handler(Looper.getMainLooper())
  private var player: ExoPlayer? = null

  private val wakeLock: PowerManager.WakeLock?
  private val wifiLock: WifiManager.WifiLock?

  private var stopWithApp: Boolean = true
  private var previousState: Int = PlaybackStateCompat.STATE_NONE
  private var lastMetadataPlayState: String? = null
  private var hasActiveTrack: Boolean = false
  private var currentTrackIsLocal: Boolean = false
  private var explicitDurationMs: Long = 0L
  private var activeTrackUrl: String? = null
  private var activeTrackUserAgent: String? = null
  private var activeTrackHeaders: Map<String, String>? = null
  private var activeTrackCacheKey: String? = null
  private var fullCacheTriggeredForTrack: Boolean = false
  private var pendingFullCacheTask: Runnable? = null

  // 60fps volume envelope state
  private var userVolume: Float = 1.0f
  private var rampFactor: Float = 1.0f
  private var eofFactor: Float = 1.0f
  private var softPlayPause: Boolean = true
  private var crossfadeMs: Int = 2000
  private var pauseRamping: Boolean = false
  private var freshTrack: Boolean = true
  private var pendingPlayRampMs: Int = 0
  private var activeRampTask: Runnable? = null

  private var receivingNoisyEvents: Boolean = false
  private val noisyReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      XmusicPlayerEventBus.emit("remote-pause")
    }
  }

  private val eofMonitorTask: Runnable = object : Runnable {
    override fun run() {
      mainHandler.removeCallbacks(this)
      val p = player ?: return
      if (crossfadeMs <= 0 || pauseRamping || !p.isPlaying) {
        if (eofFactor != 1.0f) {
          eofFactor = 1.0f
          applyEffectiveVolume()
        }
        return
      }
      val duration = getDurationMsInternal()
      val pos = p.currentPosition
      if (duration > 8000L && pos > 0L) {
        val remaining = duration - pos
        if (remaining in 1..crossfadeMs.toLong()) {
          eofFactor = max(0.05f, min(1.0f, remaining.toFloat() / crossfadeMs.toFloat()))
          applyEffectiveVolume()
        } else if (eofFactor != 1.0f) {
          eofFactor = 1.0f
          applyEffectiveVolume()
        }
      }
      mainHandler.postDelayed(this, 100L)
    }
  }

  init {
    val pm = service.getSystemService(Context.POWER_SERVICE) as? PowerManager
    wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "xmusic-player-wake-lock")?.apply {
      setReferenceCounted(false)
    }
    val wm = service.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    @Suppress("DEPRECATION")
    wifiLock = wm?.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "xmusic-player-wifi-lock")?.apply {
      setReferenceCounted(false)
    }
  }

  fun setupPlayer(
    maxCacheSizeKb: Long,
    maxBufferSec: Double,
    handleAudioFocus: Boolean,
    audioOffload: Boolean,
  ) {
    destroyPlayerOnly()
    PlayerMediaCache.init(service, maxCacheSizeKb * 1024L)

    val maxBufferMs = (maxBufferSec * 1000.0).toInt().coerceIn(180_000, 600_000)
    val loadControl = DefaultLoadControl.Builder()
      .setBufferDurationsMs(
        45_000,
        maxBufferMs,
        1_500,
        3_000,
      )
      .setTargetBufferBytes(64 * 1024 * 1024)
      .setPrioritizeTimeOverSizeThresholds(true)
      .setBackBuffer(15_000, false)
      .build()

    val renderersFactory = object : DefaultRenderersFactory(service) {
      override fun buildAudioSink(
        context: Context,
        enableFloatOutput: Boolean,
        enableAudioTrackPlaybackParams: Boolean,
      ): AudioSink {
        return DefaultAudioSink.Builder(context)
          .setEnableFloatOutput(enableFloatOutput)
          .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
          .setAudioProcessors(arrayOf(XmusicDspAudioProcessor.instance))
          .build()
      }
    }

    val exo = ExoPlayer.Builder(service, renderersFactory)
      .setLoadControl(loadControl)
      .setWakeMode(C.WAKE_MODE_NONE)
      .build()

    if (audioOffload) {
      val tsp = exo.trackSelectionParameters.buildUpon()
        .setAudioOffloadPreferences(
          TrackSelectionParameters.AudioOffloadPreferences.Builder()
            .setAudioOffloadMode(TrackSelectionParameters.AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_ENABLED)
            .setIsSpeedChangeSupportRequired(true)
            .build()
        )
        .build()
      exo.trackSelectionParameters = tsp
    }

    exo.setAudioAttributes(
      AudioAttributes.Builder()
        .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
        .setUsage(C.USAGE_MEDIA)
        .build(),
      handleAudioFocus,
    )
    exo.addListener(this)

    player = exo
    previousState = PlaybackStateCompat.STATE_NONE
    applyEffectiveVolume()
    broadcastAudioSession(exo.audioSessionId)
  }

  fun setStopWithApp(stopWithApp: Boolean) {
    this.stopWithApp = stopWithApp
  }

  fun shouldStopWithApp(): Boolean = stopWithApp

  fun setAudioTransitionConfig(softPlayPause: Boolean, crossfadeMs: Int) {
    this.softPlayPause = softPlayPause
    this.crossfadeMs = crossfadeMs.coerceIn(0, 6000)
    val p = player ?: return
    if (this.crossfadeMs <= 0 && eofFactor != 1.0f) {
      eofFactor = 1.0f
      applyEffectiveVolume()
    } else if (this.crossfadeMs > 0 && p.isPlaying && !pauseRamping) {
      mainHandler.post(eofMonitorTask)
    }
  }

  fun getAudioSessionId(): Int = player?.audioSessionId ?: 0

  fun loadTrack(
    url: String,
    userAgent: String?,
    headers: Map<String, String>?,
    cacheKey: String?,
    durationSec: Double,
    startTimeSec: Double,
    autoPlay: Boolean,
  ) {
    val p = player ?: return
    cancelActiveRamp()
    cancelPendingFullCache()
    PlayerMediaCache.cancelCurrentTrackPrefetch()
    mainHandler.removeCallbacks(eofMonitorTask)
    pauseRamping = false
    pendingPlayRampMs = 0
    freshTrack = true
    eofFactor = 1.0f
    rampFactor = 1.0f

    val uri = Uri.parse(url)
    currentTrackIsLocal = PlayerMediaCache.isLocalUri(uri)
    explicitDurationMs = if (durationSec > 0.0) (durationSec * 1000.0).toLong() else 0L
    hasActiveTrack = true
    fullCacheTriggeredForTrack = false
    if (!currentTrackIsLocal) {
      activeTrackUrl = url
      activeTrackUserAgent = userAgent
      activeTrackHeaders = headers
      activeTrackCacheKey = cacheKey
    } else {
      activeTrackUrl = null
      activeTrackUserAgent = null
      activeTrackHeaders = null
      activeTrackCacheKey = null
    }

    val source = PlayerMediaCache.buildMediaSource(service, uri, userAgent, headers, cacheKey)
    p.playWhenReady = false
    p.setMediaSource(source)
    p.prepare()
    if (startTimeSec > 0.0) {
      p.seekTo((startTimeSec * 1000.0).toLong())
    }
    if (autoPlay) {
      play()
    } else {
      p.playWhenReady = false
      applyEffectiveVolume()
    }
  }

  fun play() {
    val p = player ?: return
    cancelActiveRamp()
    pauseRamping = false
    pendingPlayRampMs = 0
    eofFactor = 1.0f

    if (p.playbackState == Player.STATE_IDLE && hasActiveTrack) {
      p.prepare()
    }

    val useTrackFadeIn = freshTrack && crossfadeMs > 0
    freshTrack = false
    val durationMs = if (useTrackFadeIn) min(crossfadeMs, 1400) else if (softPlayPause) 240 else 0

    if (durationMs <= 0) {
      rampFactor = 1.0f
      applyEffectiveVolume()
      p.playWhenReady = true
      if (crossfadeMs > 0) mainHandler.postDelayed(eofMonitorTask, 120L)
      return
    }

    if (p.isPlaying) {
      val startFactor = max(0.0f, rampFactor)
      p.playWhenReady = true
      startFadeInRamp(startFactor, durationMs)
      if (crossfadeMs > 0) mainHandler.postDelayed(eofMonitorTask, 120L)
      return
    }

    rampFactor = 0.0f
    pendingPlayRampMs = durationMs
    applyEffectiveVolume()
    XmusicDspAudioProcessor.instance.notifyPlayResume()
    p.playWhenReady = true
    maybeStartPendingPlayRamp()
  }

  fun pause() {
    val p = player ?: return
    pendingPlayRampMs = 0
    mainHandler.removeCallbacks(eofMonitorTask)
    if (!softPlayPause || !p.isPlaying || !p.playWhenReady) {
      cancelActiveRamp()
      pauseRamping = false
      rampFactor = 1.0f
      eofFactor = 1.0f
      p.playWhenReady = false
      applyEffectiveVolume()
      return
    }
    if (pauseRamping) return
    cancelActiveRamp()
    pauseRamping = true
    previousState = PlaybackStateCompat.STATE_PAUSED
    onPausedSideEffects()
    XmusicPlayerEventBus.emitState(previousState)
    notificationManager.updatePlayback(buildSessionSnapshot())

    val startFactor = max(0.05f, rampFactor * eofFactor)
    val durationMs = 200
    val startTime = SystemClock.uptimeMillis()
    val task = object : Runnable {
      override fun run() {
        if (!pauseRamping) return
        val elapsed = SystemClock.uptimeMillis() - startTime
        val t = min(1.0f, elapsed.toFloat() / durationMs.toFloat())
        val eased = (1.0f - t) * (1.0f - t)
        rampFactor = startFactor * eased
        applyEffectiveVolume()
        if (t < 1.0f) {
          mainHandler.postDelayed(this, 16L)
        } else {
          activeRampTask = null
          pauseRamping = false
          player?.playWhenReady = false
          rampFactor = 1.0f
          eofFactor = 1.0f
          applyEffectiveVolume()
        }
      }
    }
    activeRampTask = task
    mainHandler.postDelayed(task, 16L)
  }

  fun stop() {
    cancelActiveRamp()
    cancelPendingFullCache()
    PlayerMediaCache.cancelAllPrefetch()
    mainHandler.removeCallbacks(eofMonitorTask)
    pendingPlayRampMs = 0
    pauseRamping = false
    freshTrack = true
    rampFactor = 1.0f
    eofFactor = 1.0f
    hasActiveTrack = false
    explicitDurationMs = 0L
    activeTrackUrl = null
    activeTrackUserAgent = null
    activeTrackHeaders = null
    activeTrackCacheKey = null
    fullCacheTriggeredForTrack = false

    player?.let { p ->
      p.stop()
      p.playWhenReady = false
      p.clearMediaItems()
    }
    applyEffectiveVolume()
    onStoppedSideEffects()
  }

  fun seekTo(seconds: Double) {
    val p = player ?: return
    if (!hasActiveTrack) return
    val posMs = max(0L, (seconds * 1000.0).toLong())
    if (p.playbackState == Player.STATE_IDLE) {
      p.prepare()
    }
    if (softPlayPause && p.playWhenReady && !pauseRamping) {
      cancelActiveRamp()
      rampFactor = 0.0f
      pendingPlayRampMs = max(pendingPlayRampMs, 200)
      applyEffectiveVolume()
      p.seekTo(posMs)
      mainHandler.postDelayed({ maybeStartPendingPlayRamp() }, 48L)
      return
    }
    p.seekTo(posMs)
  }

  fun setVolume(volume: Float) {
    userVolume = volume.coerceIn(0.0f, 1.0f)
    applyEffectiveVolume()
  }

  fun setRate(rate: Float) {
    val p = player ?: return
    val safeRate = rate.coerceIn(0.25f, 4.0f)
    p.playbackParameters = PlaybackParameters(safeRate, p.playbackParameters.pitch)
  }

  fun getState(): Int {
    val p = player ?: return PlaybackStateCompat.STATE_NONE
    return when (p.playbackState) {
      Player.STATE_BUFFERING -> if (p.playWhenReady) {
        PlaybackStateCompat.STATE_BUFFERING
      } else {
        PlaybackStateCompat.STATE_CONNECTING
      }
      Player.STATE_ENDED -> PlaybackStateCompat.STATE_STOPPED
      Player.STATE_IDLE -> PlaybackStateCompat.STATE_NONE
      Player.STATE_READY -> {
        if (pauseRamping) PlaybackStateCompat.STATE_PAUSED
        else if (p.playWhenReady && p.isPlaying) PlaybackStateCompat.STATE_PLAYING
        else PlaybackStateCompat.STATE_PAUSED
      }
      else -> PlaybackStateCompat.STATE_NONE
    }
  }

  fun getPositionSec(): Double = (player?.currentPosition ?: 0L) / 1000.0

  fun getDurationSec(): Double = getDurationMsInternal() / 1000.0

  fun getBufferedPositionSec(): Double = (player?.bufferedPosition ?: 0L) / 1000.0

  private fun getDurationMsInternal(): Long {
    if (explicitDurationMs > 0L) return explicitDurationMs
    val dur = player?.duration ?: C.TIME_UNSET
    return if (dur == C.TIME_UNSET || dur < 0L) 0L else dur
  }

  fun updateMetadata(meta: NowPlayingTrackMetadata, isPlayingOverride: Boolean? = null) {
    if (meta.durationMs > 0L) {
      explicitDurationMs = meta.durationMs
    }
    notificationManager.setActive(true)
    notificationManager.updateMetadata(meta)
    if (isPlayingOverride != null) {
      notificationManager.updatePlayback(
        buildSessionSnapshot().copy(isPlaying = isPlayingOverride)
      )
    }
  }

  fun updateTitles(title: String?, artist: String?, album: String?, lyric: String?) {
    notificationManager.updateTitles(title, artist, album, lyric)
  }

  fun setFavoriteState(favorite: Boolean) {
    notificationManager.setFavoriteState(favorite)
  }

  fun destroy() {
    destroyPlayerOnly()
    notificationManager.destroy()
    PlayerMediaCache.release()
  }

  private fun destroyPlayerOnly() {
    cancelActiveRamp()
    cancelPendingFullCache()
    PlayerMediaCache.cancelAllPrefetch()
    mainHandler.removeCallbacks(eofMonitorTask)
    pendingPlayRampMs = 0
    pauseRamping = false
    broadcastAudioSession(0)
    onStoppedSideEffects()
    player?.let { p ->
      p.removeListener(this)
      p.release()
    }
    player = null
  }

  // ---- Player.Listener callbacks ----

  override fun onAudioSessionIdChanged(audioSessionId: Int) {
    broadcastAudioSession(audioSessionId)
  }

  override fun onIsPlayingChanged(isPlaying: Boolean) {
    if (isPlaying) {
      maybeStartPendingPlayRamp()
      scheduleFullTrackCacheIfNeeded()
    } else {
      cancelPendingFullCache()
    }
    handlePlaybackStateChange()
  }

  override fun onPlaybackStateChanged(playbackState: Int) {
    handlePlaybackStateChange()
    if (playbackState == Player.STATE_ENDED && hasActiveTrack) {
      hasActiveTrack = false
      cancelActiveRamp()
      mainHandler.removeCallbacks(eofMonitorTask)
      XmusicPlayerEventBus.emit("playback-track-ended")
    }
  }

  override fun onPlayWhenReadyChanged(playWhenReady: Boolean, reason: Int) {
    handlePlaybackStateChange()
    when (reason) {
      Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_FOCUS_LOSS -> {
        val b = android.os.Bundle().apply {
          putBoolean("permanent", true)
          putBoolean("paused", true)
          putBoolean("ducking", false)
        }
        XmusicPlayerEventBus.emit("remote-duck", b)
      }
      Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_BECOMING_NOISY -> {
        val b = android.os.Bundle().apply {
          putBoolean("permanent", false)
          putBoolean("paused", true)
          putBoolean("ducking", false)
        }
        XmusicPlayerEventBus.emit("remote-duck", b)
      }
    }
  }

  override fun onPlaybackSuppressionReasonChanged(playbackSuppressionReason: Int) {
    handlePlaybackStateChange()
    val ducking = playbackSuppressionReason == Player.PLAYBACK_SUPPRESSION_REASON_TRANSIENT_AUDIO_FOCUS_LOSS
    val b = android.os.Bundle().apply {
      putBoolean("permanent", false)
      putBoolean("paused", ducking)
      putBoolean("ducking", ducking)
    }
    XmusicPlayerEventBus.emit("remote-duck", b)
  }

  override fun onPlayerError(error: PlaybackException) {
    hasActiveTrack = false
    cancelActiveRamp()
    mainHandler.removeCallbacks(eofMonitorTask)
    val cause = error.cause
    val code = when (cause) {
      is HttpDataSource.HttpDataSourceException -> "playback-source"
      is ExoPlaybackException -> "playback-renderer"
      else -> "playback"
    }
    XmusicPlayerEventBus.emitError(code, cause?.message ?: error.message)
  }

  private fun handlePlaybackStateChange() {
    val state = getState()
    if (state != previousState) {
      if (isPlayingLikeState(state) && !isPlayingLikeState(previousState)) {
        onPlayingSideEffects()
      } else if (isPausedLikeState(state) && !isPausedLikeState(previousState)) {
        onPausedSideEffects()
      } else if (isStoppedLikeState(state) && !isStoppedLikeState(previousState)) {
        onStoppedSideEffects()
      }

      previousState = state
      XmusicPlayerEventBus.emitState(state)

      val playStateStr = if (isPlayingLikeState(state)) "playing" else "paused"
      if (playStateStr != lastMetadataPlayState || state == PlaybackStateCompat.STATE_PLAYING) {
        lastMetadataPlayState = playStateStr
        notificationManager.updatePlayback(buildSessionSnapshot())
      }
    }
  }

  @SuppressLint("WakelockTimeout")
  private fun onPlayingSideEffects() {
    if (!receivingNoisyEvents) {
      receivingNoisyEvents = true
      try {
        service.registerReceiver(noisyReceiver, IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY))
      } catch (_: Exception) {}
    }
    if (wakeLock != null && !wakeLock.isHeld) {
      try { wakeLock.acquire() } catch (_: Exception) {}
    }
    if (!currentTrackIsLocal && wifiLock != null && !wifiLock.isHeld) {
      try { wifiLock.acquire() } catch (_: Exception) {}
    }
    if (hasActiveTrack) {
      notificationManager.setActive(true)
    }
  }

  private fun onPausedSideEffects() {
    unregisterNoisyReceiver()
    releaseLocks()
    if (hasActiveTrack) {
      notificationManager.setActive(true)
    }
  }

  private fun onStoppedSideEffects() {
    unregisterNoisyReceiver()
    releaseLocks()
    notificationManager.setActive(false)
  }

  private fun unregisterNoisyReceiver() {
    if (receivingNoisyEvents) {
      receivingNoisyEvents = false
      try {
        service.unregisterReceiver(noisyReceiver)
      } catch (_: Exception) {}
    }
  }

  private fun releaseLocks() {
    if (wakeLock != null && wakeLock.isHeld) {
      try { wakeLock.release() } catch (_: Exception) {}
    }
    if (wifiLock != null && wifiLock.isHeld) {
      try { wifiLock.release() } catch (_: Exception) {}
    }
  }

  private fun cancelPendingFullCache() {
    pendingFullCacheTask?.let { mainHandler.removeCallbacks(it) }
    pendingFullCacheTask = null
  }

  private fun scheduleFullTrackCacheIfNeeded() {
    if (fullCacheTriggeredForTrack || currentTrackIsLocal) return
    val url = activeTrackUrl ?: return
    if (pendingFullCacheTask != null) return
    val ua = activeTrackUserAgent
    val hdrs = activeTrackHeaders
    val key = activeTrackCacheKey
    val task = Runnable {
      pendingFullCacheTask = null
      val p = player ?: return@Runnable
      if (!p.isPlaying || fullCacheTriggeredForTrack || activeTrackUrl != url) return@Runnable
      fullCacheTriggeredForTrack = true
      PlayerMediaCache.prefetchFullTrack(service, url, ua, hdrs, key)
    }
    pendingFullCacheTask = task
    mainHandler.postDelayed(task, 2000L)
  }

  private fun cancelActiveRamp() {
    activeRampTask?.let { mainHandler.removeCallbacks(it) }
    activeRampTask = null
  }

  private fun applyEffectiveVolume() {
    val effective = (userVolume * rampFactor * eofFactor).coerceIn(0.0f, 1.0f)
    player?.volume = effective
  }

  private fun startFadeInRamp(startFactor: Float, durationMs: Int) {
    cancelActiveRamp()
    rampFactor = startFactor
    applyEffectiveVolume()
    val startTime = SystemClock.uptimeMillis()
    val task = object : Runnable {
      override fun run() {
        val elapsed = SystemClock.uptimeMillis() - startTime
        val t = min(1.0f, elapsed.toFloat() / durationMs.toFloat())
        val eased = 1.0f - (1.0f - t) * (1.0f - t) * (1.0f - t)
        rampFactor = startFactor + (1.0f - startFactor) * eased
        applyEffectiveVolume()
        if (t < 1.0f) {
          mainHandler.postDelayed(this, 16L)
        } else {
          activeRampTask = null
        }
      }
    }
    activeRampTask = task
    mainHandler.postDelayed(task, 16L)
  }

  private fun maybeStartPendingPlayRamp() {
    val p = player ?: return
    if (pendingPlayRampMs <= 0 || pauseRamping || !p.isPlaying) return
    val dur = pendingPlayRampMs
    pendingPlayRampMs = 0
    startFadeInRamp(0.0f, dur)
    if (crossfadeMs > 0) mainHandler.postDelayed(eofMonitorTask, 120L)
  }

  private fun broadcastAudioSession(sessionId: Int) {
    try {
      val intent = Intent(ACTION_AUDIO_SESSION_CHANGED).apply {
        setPackage(service.packageName)
        putExtra("audioSessionId", sessionId)
      }
      service.sendBroadcast(intent)
    } catch (_: Exception) {}
  }

  private fun buildSessionSnapshot(): PlaybackSnapshotForSession {
    val state = getState()
    val p = player
    return PlaybackSnapshotForSession(
      state = state,
      positionMs = p?.currentPosition ?: 0L,
      bufferedMs = p?.bufferedPosition ?: 0L,
      rate = p?.playbackParameters?.speed ?: 1.0f,
      isPlaying = isPlayingLikeState(state),
    )
  }

  private fun isPlayingLikeState(state: Int): Boolean =
    state == PlaybackStateCompat.STATE_PLAYING || state == PlaybackStateCompat.STATE_BUFFERING

  private fun isPausedLikeState(state: Int): Boolean =
    state == PlaybackStateCompat.STATE_PAUSED || state == PlaybackStateCompat.STATE_CONNECTING

  private fun isStoppedLikeState(state: Int): Boolean =
    state == PlaybackStateCompat.STATE_NONE || state == PlaybackStateCompat.STATE_STOPPED
}
