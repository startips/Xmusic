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
import androidx.media3.common.Format
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.common.Tracks
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

data class AudioFormatSnapshot(
  val codec: String,
  val mimeType: String,
  val sampleRate: Int,
  val bitDepth: Int,
  val bitrate: Int,
  val channelCount: Int,
)

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
  private var isSwitchingTrack: Boolean = false
  private var isLoadingTrack: Boolean = false
  private var currentTrackIsLocal: Boolean = false
  private var currentTrackUrl: String = ""
  private var currentAudioFormat: AudioFormatSnapshot? = null
  private var explicitDurationMs: Long = 0L

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
    if (!this.softPlayPause && !pauseRamping && pendingPlayRampMs <= 0 && activeRampTask == null && rampFactor < 1.0f) {
      rampFactor = 1.0f
      applyEffectiveVolume()
    }
    if (this.crossfadeMs <= 0 && eofFactor != 1.0f) {
      eofFactor = 1.0f
      applyEffectiveVolume()
    } else if (this.crossfadeMs > 0 && p.isPlaying && !pauseRamping) {
      mainHandler.post(eofMonitorTask)
    }
  }

  fun getAudioSessionId(): Int = player?.audioSessionId ?: 0

  fun getAudioFormat(): AudioFormatSnapshot? = currentAudioFormat

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
    PlayerMediaCache.cancelAllPrefetch()
    mainHandler.removeCallbacks(eofMonitorTask)
    pauseRamping = false
    pendingPlayRampMs = 0
    freshTrack = true
    eofFactor = 1.0f
    rampFactor = 1.0f

    val uri = Uri.parse(url)
    currentTrackUrl = url
    currentAudioFormat = null
    currentTrackIsLocal = PlayerMediaCache.isLocalUri(uri)
    explicitDurationMs = if (durationSec > 0.0) (durationSec * 1000.0).toLong() else 0L
    hasActiveTrack = true
    isSwitchingTrack = false
    isLoadingTrack = autoPlay

    val source = PlayerMediaCache.buildMediaSource(service, uri, userAgent, headers, cacheKey)
    p.playWhenReady = false
    p.setMediaSource(source)
    p.prepare()
    if (startTimeSec > 0.0) {
      p.seekTo((startTimeSec * 1000.0).toLong())
    }
    isLoadingTrack = false
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
    isSwitchingTrack = false
    pauseRamping = false
    pendingPlayRampMs = 0
    eofFactor = 1.0f

    if (p.playbackState == Player.STATE_IDLE && hasActiveTrack) {
      p.prepare()
    }

    val useTrackFadeIn = freshTrack && crossfadeMs > 0
    freshTrack = false
    val durationMs = if (useTrackFadeIn) min(crossfadeMs, 1400) else if (softPlayPause) 110 else 0

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
    p.playWhenReady = true
    maybeStartPendingPlayRamp()
  }

  fun pause() {
    val p = player ?: return
    val wasSwitching = isSwitchingTrack || isLoadingTrack
    isSwitchingTrack = false
    isLoadingTrack = false
    pendingPlayRampMs = 0
    mainHandler.removeCallbacks(eofMonitorTask)
    if (!softPlayPause || !p.isPlaying || !p.playWhenReady) {
      cancelActiveRamp()
      pauseRamping = false
      rampFactor = 1.0f
      eofFactor = 1.0f
      p.playWhenReady = false
      applyEffectiveVolume()
      if (wasSwitching && notificationManager.session.isActive) {
        previousState = PlaybackStateCompat.STATE_PAUSED
        lastMetadataPlayState = "paused"
        notificationManager.updatePlayback(
          PlaybackSnapshotForSession(
            state = PlaybackStateCompat.STATE_PAUSED,
            positionMs = 0L,
            bufferedMs = 0L,
            rate = 0f,
            isPlaying = false,
          )
        )
      }
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
    val durationMs = 140
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
          mainHandler.postDelayed(this, 10L)
        } else {
          activeRampTask = null
          pauseRamping = false
          rampFactor = 0.0f
          eofFactor = 1.0f
          applyEffectiveVolume()
          player?.playWhenReady = false
        }
      }
    }
    activeRampTask = task
    mainHandler.postDelayed(task, 10L)
  }

  fun stop(keepSession: Boolean = false) {
    cancelActiveRamp()
    PlayerMediaCache.cancelAllPrefetch()
    mainHandler.removeCallbacks(eofMonitorTask)
    pendingPlayRampMs = 0
    pauseRamping = false
    freshTrack = true
    rampFactor = 1.0f
    eofFactor = 1.0f
    hasActiveTrack = false
    currentTrackUrl = ""
    currentAudioFormat = null
    explicitDurationMs = 0L

    if (keepSession) {
      isSwitchingTrack = true
      isLoadingTrack = false
      player?.let { p ->
        p.stop()
        p.playWhenReady = false
        p.clearMediaItems()
      }
      applyEffectiveVolume()
      if (notificationManager.session.isActive) {
        previousState = PlaybackStateCompat.STATE_BUFFERING
        lastMetadataPlayState = "playing"
        notificationManager.updatePlayback(
          PlaybackSnapshotForSession(
            state = PlaybackStateCompat.STATE_BUFFERING,
            positionMs = 0L,
            bufferedMs = 0L,
            rate = 0f,
            isPlaying = true,
          )
        )
      }
      return
    }

    isSwitchingTrack = false
    isLoadingTrack = false
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
    if (!pauseRamping && pendingPlayRampMs <= 0 && activeRampTask == null && rampFactor < 1.0f && p.playWhenReady) {
      rampFactor = 1.0f
      applyEffectiveVolume()
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
    if (isSwitchingTrack || isLoadingTrack) {
      return PlaybackStateCompat.STATE_BUFFERING
    }
    val p = player ?: return PlaybackStateCompat.STATE_NONE
    return when (p.playbackState) {
      Player.STATE_BUFFERING -> if (p.playWhenReady) {
        PlaybackStateCompat.STATE_BUFFERING
      } else {
        PlaybackStateCompat.STATE_CONNECTING
      }
      Player.STATE_ENDED -> PlaybackStateCompat.STATE_PAUSED
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
    val baseSnap = buildSessionSnapshot()
    val snap = if (isPlayingOverride != null) {
      val resolvedState = when {
        isPlayingOverride && !isPlayingLikeState(baseSnap.state) -> PlaybackStateCompat.STATE_BUFFERING
        !isPlayingOverride && (baseSnap.state == PlaybackStateCompat.STATE_NONE || baseSnap.state == PlaybackStateCompat.STATE_STOPPED) -> PlaybackStateCompat.STATE_PAUSED
        else -> baseSnap.state
      }
      baseSnap.copy(
        state = resolvedState,
        rate = if (resolvedState == PlaybackStateCompat.STATE_PLAYING) baseSnap.rate else 0f,
        isPlaying = isPlayingOverride,
      )
    } else {
      baseSnap
    }
    notificationManager.updateMetadata(meta, snap)
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
    PlayerMediaCache.cancelAllPrefetch()
    mainHandler.removeCallbacks(eofMonitorTask)
    pendingPlayRampMs = 0
    pauseRamping = false
    isSwitchingTrack = false
    isLoadingTrack = false
    currentTrackUrl = ""
    currentAudioFormat = null
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
      if (pendingPlayRampMs > 0) {
        maybeStartPendingPlayRamp()
      } else if (!pauseRamping && activeRampTask == null && rampFactor < 1.0f) {
        rampFactor = 1.0f
        applyEffectiveVolume()
      }
    }
    handlePlaybackStateChange()
  }

  override fun onTracksChanged(tracks: Tracks) {
    refreshAudioFormat(tracks)
  }

  override fun onPlaybackStateChanged(playbackState: Int) {
    handlePlaybackStateChange()
    if (playbackState == Player.STATE_READY) {
      refreshAudioFormat(player?.currentTracks)
    }
    if (playbackState == Player.STATE_ENDED && hasActiveTrack) {
      hasActiveTrack = false
      cancelActiveRamp()
      mainHandler.removeCallbacks(eofMonitorTask)
      XmusicPlayerEventBus.emit("playback-track-ended")
    }
  }

  private fun refreshAudioFormat(tracks: Tracks?) {
    val p = player ?: return
    var trackFmt: Format? = null
    if (tracks != null) {
      for (group in tracks.groups) {
        if (group.type == C.TRACK_TYPE_AUDIO && group.length > 0) {
          if (group.isSelected) {
            for (i in 0 until group.length) {
              if (group.isTrackSelected(i)) {
                trackFmt = group.getTrackFormat(i)
                break
              }
            }
            if (trackFmt != null) break
          } else if (trackFmt == null) {
            trackFmt = group.getTrackFormat(0)
          }
        }
      }
    }
    val decoderFmt = p.audioFormat
    val primary = trackFmt ?: decoderFmt ?: return

    val mimeType = primary.sampleMimeType ?: decoderFmt?.sampleMimeType ?: ""
    val containerMime = primary.containerMimeType ?: decoderFmt?.containerMimeType
    val codec = resolveCodecLabel(mimeType, containerMime, primary.codecs, currentTrackUrl)
    val sampleRate = when {
      primary.sampleRate > 0 -> primary.sampleRate
      (decoderFmt?.sampleRate ?: 0) > 0 -> decoderFmt!!.sampleRate
      else -> 0
    }
    val channelCount = when {
      primary.channelCount > 0 -> primary.channelCount
      (decoderFmt?.channelCount ?: 0) > 0 -> decoderFmt!!.channelCount
      else -> 0
    }
    val bitrate = when {
      primary.averageBitrate > 0 -> primary.averageBitrate
      primary.bitrate > 0 -> primary.bitrate
      primary.peakBitrate > 0 -> primary.peakBitrate
      (decoderFmt?.bitrate ?: 0) > 0 -> decoderFmt!!.bitrate
      else -> 0
    }
    val isLossless = codec == "FLAC" || codec == "WAV" || codec == "APE" || codec == "ALAC" || codec == "PCM" || codec == "DSD"
    val rawPcmEncoding = when {
      primary.pcmEncoding != Format.NO_VALUE -> primary.pcmEncoding
      isLossless && (decoderFmt?.pcmEncoding ?: Format.NO_VALUE) != Format.NO_VALUE -> decoderFmt!!.pcmEncoding
      else -> Format.NO_VALUE
    }
    val bitDepth = if (isLossless) pcmEncodingToBitDepth(rawPcmEncoding) else 0

    val snapshot = AudioFormatSnapshot(
      codec = codec,
      mimeType = mimeType,
      sampleRate = sampleRate,
      bitDepth = bitDepth,
      bitrate = bitrate,
      channelCount = channelCount,
    )
    if (snapshot != currentAudioFormat) {
      currentAudioFormat = snapshot
      XmusicPlayerEventBus.emitAudioFormat(snapshot)
    }
  }

  private fun pcmEncodingToBitDepth(encoding: Int): Int = when (encoding) {
    C.ENCODING_PCM_8BIT -> 8
    C.ENCODING_PCM_16BIT, C.ENCODING_PCM_16BIT_BIG_ENDIAN -> 16
    C.ENCODING_PCM_24BIT, C.ENCODING_PCM_24BIT_BIG_ENDIAN -> 24
    C.ENCODING_PCM_32BIT, C.ENCODING_PCM_32BIT_BIG_ENDIAN, C.ENCODING_PCM_FLOAT -> 32
    else -> 0
  }

  private fun resolveCodecLabel(
    mimeType: String,
    containerMime: String?,
    codecs: String?,
    url: String,
  ): String {
    val m = mimeType.lowercase()
    val c = containerMime?.lowercase().orEmpty()
    val u = url.substringBefore('?').lowercase()
    return when {
      m.contains("flac") -> "FLAC"
      m == "audio/mpeg" || m == "audio/mp3" -> "MP3"
      m == "audio/mp4a-latm" || m.contains("aac") -> "AAC"
      m == "audio/alac" -> "ALAC"
      m == "audio/vorbis" -> "OGG"
      m == "audio/opus" -> "OPUS"
      m.contains("ape") -> "APE"
      m.contains("wav") || (m == "audio/raw" && (c.contains("wav") || u.endsWith(".wav"))) -> "WAV"
      m == "audio/raw" -> "PCM"
      m == "audio/ac3" -> "AC3"
      m == "audio/eac3" -> "EAC3"
      m.startsWith("audio/") -> m.removePrefix("audio/").uppercase()
      !codecs.isNullOrBlank() -> codecs.uppercase()
      else -> ""
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
    if (isSwitchingTrack || isLoadingTrack) return
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
      lastMetadataPlayState = playStateStr
      if (notificationManager.session.isActive) {
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
          mainHandler.postDelayed(this, 10L)
        } else {
          activeRampTask = null
        }
      }
    }
    activeRampTask = task
    mainHandler.postDelayed(task, 10L)
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
    val rate = if (state == PlaybackStateCompat.STATE_PLAYING) {
      p?.playbackParameters?.speed ?: 1.0f
    } else {
      0f
    }
    return PlaybackSnapshotForSession(
      state = state,
      positionMs = if (isSwitchingTrack) 0L else (p?.currentPosition ?: 0L),
      bufferedMs = if (isSwitchingTrack) 0L else (p?.bufferedPosition ?: 0L),
      rate = rate,
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
