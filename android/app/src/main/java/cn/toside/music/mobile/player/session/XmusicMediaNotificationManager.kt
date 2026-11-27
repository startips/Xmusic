package cn.toside.music.mobile.player.session

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Bundle
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import androidx.media.session.MediaButtonReceiver
import cn.toside.music.mobile.R
import cn.toside.music.mobile.player.XmusicPlaybackService
import cn.toside.music.mobile.player.XmusicPlayerEventBus
import cn.toside.music.mobile.widget.XmusicWidgetUpdater
import com.bumptech.glide.Glide
import com.bumptech.glide.request.target.CustomTarget
import com.bumptech.glide.request.transition.Transition
import java.util.concurrent.Executors

data class NowPlayingTrackMetadata(
  val title: String,
  val artist: String,
  val album: String?,
  val artwork: String?,
  val durationMs: Long,
  val lyric: String?,
)

data class PlaybackSnapshotForSession(
  val state: Int,
  val positionMs: Long,
  val bufferedMs: Long,
  val rate: Float,
  val isPlaying: Boolean,
)

/**
 * Manages [MediaSessionCompat], M3/HyperOS Super Island artwork & favorite action,
 * Bluetooth full lyrics metadata, and foreground media notification.
 */
class XmusicMediaNotificationManager(
  private val service: Service,
  private val snapshotProvider: () -> PlaybackSnapshotForSession,
) {
  companion object {
    const val NOTIFICATION_ID = 1
    const val CHANNEL_ID = "cn.toside.music.mobile.playback"
    const val ACTION_TOGGLE_FAVORITE = "xmusic_toggle_favorite"
    private const val ACTION_WIDGET_STATE_CHANGED = "com.startips.xmusic.WIDGET_STATE_CHANGED"
    private const val METADATA_KEY_LYRICS = "android.media.metadata.LYRICS"

    private const val SUPPORTED_ACTIONS: Long =
      PlaybackStateCompat.ACTION_PLAY or
        PlaybackStateCompat.ACTION_PAUSE or
        PlaybackStateCompat.ACTION_PLAY_PAUSE or
        PlaybackStateCompat.ACTION_SEEK_TO or
        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
  }

  val session: MediaSessionCompat
  private val builder: NotificationCompat.Builder
  private val widgetCoverExecutor = Executors.newSingleThreadExecutor()

  private var prevMetadata: MediaMetadataCompat.Builder? = null
  private var prevArtworkUrl: String? = null
  private var prevArtResource: Bitmap? = null
  private var artworkTarget: CustomTarget<Bitmap>? = null

  private var isFavorite: Boolean = false
  private var lastPlaying: Boolean = false
  private var lastWidgetTitle: String = ""
  private var lastWidgetArtist: String = ""

  private val prevAction: NotificationCompat.Action
  private val playAction: NotificationCompat.Action
  private val pauseAction: NotificationCompat.Action
  private val nextAction: NotificationCompat.Action

  init {
    ensureNotificationChannel()
    builder = NotificationCompat.Builder(service, CHANNEL_ID)
    session = MediaSessionCompat(service, "XmusicPlayer", null, null)
    session.setFlags(MediaSessionCompat.FLAG_HANDLES_QUEUE_COMMANDS)
    session.setCallback(object : MediaSessionCompat.Callback() {
      override fun onPlay() {
        XmusicPlayerEventBus.emit("remote-play")
      }

      override fun onPause() {
        XmusicPlayerEventBus.emit("remote-pause")
      }

      override fun onStop() {
        XmusicPlayerEventBus.emit("remote-stop")
      }

      override fun onSkipToNext() {
        XmusicPlayerEventBus.emit("remote-next")
      }

      override fun onSkipToPrevious() {
        XmusicPlayerEventBus.emit("remote-previous")
      }

      override fun onSeekTo(pos: Long) {
        XmusicPlayerEventBus.emitSeek(pos / 1000.0)
      }

      override fun onCustomAction(action: String?, extras: Bundle?) {
        if (ACTION_TOGGLE_FAVORITE == action) {
          XmusicPlayerEventBus.emit("remote-toggle-favorite")
        }
      }
    })

    val appContext = service.applicationContext
    val packageName = appContext.packageName
    val openApp = (appContext.packageManager.getLaunchIntentForPackage(packageName) ?: Intent().apply {
      setPackage(packageName)
      addCategory(Intent.CATEGORY_LAUNCHER)
    }).apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      action = Intent.ACTION_VIEW
    }

    val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }

    builder.setContentIntent(PendingIntent.getActivity(appContext, 0, openApp, pendingFlags))
    builder.setSmallIcon(R.drawable.ic_stat_xmusic)
    builder.setCategory(NotificationCompat.CATEGORY_TRANSPORT)
    builder.setDeleteIntent(
      MediaButtonReceiver.buildMediaButtonPendingIntent(service, PlaybackStateCompat.ACTION_STOP)
    )
    builder.setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
    builder.setShowWhen(false)
    builder.setOnlyAlertOnce(true)

    prevAction = NotificationCompat.Action(
      R.drawable.ic_notif_prev,
      "Previous",
      MediaButtonReceiver.buildMediaButtonPendingIntent(service, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS),
    )
    playAction = NotificationCompat.Action(
      R.drawable.ic_notif_play,
      "Play",
      MediaButtonReceiver.buildMediaButtonPendingIntent(service, PlaybackStateCompat.ACTION_PLAY),
    )
    pauseAction = NotificationCompat.Action(
      R.drawable.ic_notif_pause,
      "Pause",
      MediaButtonReceiver.buildMediaButtonPendingIntent(service, PlaybackStateCompat.ACTION_PAUSE),
    )
    nextAction = NotificationCompat.Action(
      R.drawable.ic_notif_next,
      "Next",
      MediaButtonReceiver.buildMediaButtonPendingIntent(service, PlaybackStateCompat.ACTION_SKIP_TO_NEXT),
    )
  }

  fun ensureNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = service.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
      val existing = mgr.getNotificationChannel(CHANNEL_ID)
      if (existing == null) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          "Xmusic Playback",
          NotificationManager.IMPORTANCE_LOW,
        ).apply {
          setShowBadge(false)
          setSound(null, null)
        }
        mgr.createNotificationChannel(channel)
      }
    }
  }

  fun buildPlaceholderNotification(): Notification {
    ensureNotificationChannel()
    return NotificationCompat.Builder(service, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_xmusic)
      .setContentTitle("Xmusic")
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .build()
  }

  fun setActive(active: Boolean) {
    if (session.isActive == active) return
    session.isActive = active
    updateNotification()
  }

  fun setFavoriteState(favorite: Boolean) {
    if (isFavorite == favorite) return
    isFavorite = favorite
    val snap = snapshotProvider()
    updatePlaybackActions(snap.isPlaying)
    updatePlaybackState(snap)
    updateNotification()
  }

  fun updateMetadata(meta: NowPlayingTrackMetadata, snapshotOverride: PlaybackSnapshotForSession? = null) {
    val mdBuilder = MediaMetadataCompat.Builder().apply {
      putString(MediaMetadataCompat.METADATA_KEY_TITLE, meta.title)
      putString(MediaMetadataCompat.METADATA_KEY_ARTIST, meta.artist)
      if (!meta.album.isNullOrEmpty()) {
        putString(MediaMetadataCompat.METADATA_KEY_ALBUM, meta.album)
      }
      if (!meta.lyric.isNullOrEmpty()) {
        putString(METADATA_KEY_LYRICS, meta.lyric)
      }
      if (meta.durationMs > 0L) {
        putLong(MediaMetadataCompat.METADATA_KEY_DURATION, meta.durationMs)
      }
      if (!meta.artwork.isNullOrEmpty()) {
        putString(MediaMetadataCompat.METADATA_KEY_ART_URI, meta.artwork)
      }
    }
    prevMetadata = mdBuilder

    val rm = Glide.with(service.applicationContext)
    artworkTarget?.let { rm.clear(it) }
    artworkTarget = null

    val artUrl = meta.artwork?.takeIf { it.isNotBlank() }
    val cachedBmp = prevArtResource
    if (artUrl == null) {
      prevArtworkUrl = null
      prevArtResource = null
      builder.setLargeIcon(null as Bitmap?)
    } else if (artUrl == prevArtworkUrl && cachedBmp != null && !cachedBmp.isRecycled) {
      mdBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, cachedBmp)
      mdBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, cachedBmp)
      builder.setLargeIcon(cachedBmp)
    } else {
      prevArtworkUrl = artUrl
      prevArtResource = null

      val target = object : CustomTarget<Bitmap>() {
        override fun onResourceReady(resource: Bitmap, transition: Transition<in Bitmap>?) {
          if (prevArtworkUrl != artUrl || resource.isRecycled) return
          prevArtResource = resource
          mdBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, resource)
          mdBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, resource)
          builder.setLargeIcon(resource)
          session.setMetadata(mdBuilder.build())
          updateNotification()
          persistWidgetArtworkAsync(resource)
        }

        override fun onLoadCleared(placeholder: Drawable?) {
          if (prevArtworkUrl == artUrl) {
            prevArtResource = null
          }
        }
      }
      artworkTarget = target
      rm.asBitmap()
        .load(artUrl)
        .override(768, 768)
        .centerCrop()
        .into(target)
    }

    lastWidgetTitle = meta.title
    lastWidgetArtist = meta.artist
    builder.setContentTitle(meta.title)
    builder.setContentText(meta.artist)
    builder.setSubText(meta.album)

    session.setMetadata(mdBuilder.build())
    val snap = snapshotOverride ?: snapshotProvider()
    updatePlaybackActions(snap.isPlaying)
    updatePlaybackState(snap)
    updateNotification()
  }

  fun updateTitles(title: String?, artist: String?, album: String?, lyric: String?) {
    val md = prevMetadata ?: return
    if (title != null) md.putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
    if (artist != null) md.putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
    if (album != null) md.putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album)
    if (lyric != null) md.putString(METADATA_KEY_LYRICS, lyric)

    val art = prevArtResource
    if (art != null && !art.isRecycled) {
      md.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, art)
      md.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, art)
    }
    session.setMetadata(md.build())
    updatePlaybackState(snapshotProvider())
  }

  fun updatePlayback(snap: PlaybackSnapshotForSession) {
    prevMetadata?.let { md ->
      val art = prevArtResource
      if (art != null && !art.isRecycled) {
        md.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, art)
        md.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, art)
      }
      session.setMetadata(md.build())
    }
    updatePlaybackActions(snap.isPlaying)
    updatePlaybackState(snap)
    updateNotification()
  }

  fun destroy() {
    artworkTarget?.let {
      try {
        Glide.with(service.applicationContext).clear(it)
      } catch (_: Exception) {}
    }
    artworkTarget = null
    prevArtResource = null
    widgetCoverExecutor.shutdownNow()
    stopServiceForeground()
    session.isActive = false
    session.release()
  }

  private fun stopServiceForeground() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      service.stopForeground(Service.STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      service.stopForeground(true)
    }
  }

  @SuppressLint("RestrictedApi")
  private fun updatePlaybackActions(playing: Boolean) {
    lastPlaying = playing
    broadcastWidgetState()

    builder.mActions.clear()
    builder.mActions.add(prevAction) // index 0
    builder.mActions.add(if (playing) pauseAction else playAction) // index 1
    builder.mActions.add(nextAction) // index 2
    builder.mActions.add(createFavoriteAction()) // index 3

    if (!Build.MANUFACTURER.lowercase().contains("huawei") || Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val style = MediaStyle()
        .setMediaSession(session.sessionToken)
        .setShowActionsInCompactView(0, 1, 2)
        .setShowCancelButton(false)
      builder.setStyle(style)
    }
  }

  @SuppressLint("UnspecifiedImmutableFlag")
  private fun createFavoriteAction(): NotificationCompat.Action {
    val favIcon = if (isFavorite) R.drawable.ic_media_favorite_on else R.drawable.ic_media_favorite_off
    val favIntent = Intent(service, XmusicPlaybackService::class.java).apply {
      action = ACTION_TOGGLE_FAVORITE
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    val pi = PendingIntent.getService(service, 1001, favIntent, flags)
    return NotificationCompat.Action(favIcon, if (isFavorite) "已收藏" else "收藏", pi)
  }

  private fun updatePlaybackState(snap: PlaybackSnapshotForSession) {
    val pb = PlaybackStateCompat.Builder()
      .setActions(SUPPORTED_ACTIONS)
      .setState(snap.state, snap.positionMs, snap.rate)
      .setBufferedPosition(snap.bufferedMs)

    val favIcon = if (isFavorite) R.drawable.ic_media_favorite_on else R.drawable.ic_media_favorite_off
    val extras = Bundle().apply { putBoolean("isFavorite", isFavorite) }
    pb.addCustomAction(
      PlaybackStateCompat.CustomAction.Builder(
        ACTION_TOGGLE_FAVORITE,
        if (isFavorite) "已收藏" else "收藏",
        favIcon,
      ).setExtras(extras).build()
    )
    session.setPlaybackState(pb.build())
  }

  private fun updateNotification() {
    if (session.isActive) {
      val notification = builder.build()
      try {
        val svcIntent = Intent(service, XmusicPlaybackService::class.java)
        try {
          service.startService(svcIntent)
        } catch (_: Exception) {}
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          service.startForeground(
            NOTIFICATION_ID,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
          )
        } else {
          service.startForeground(NOTIFICATION_ID, notification)
        }
      } catch (_: Exception) {}
    } else {
      stopServiceForeground()
    }
  }

  private fun broadcastWidgetState() {
    try {
      val intent = Intent(ACTION_WIDGET_STATE_CHANGED).apply {
        setPackage(service.packageName)
        putExtra("title", lastWidgetTitle)
        putExtra("artist", lastWidgetArtist)
        putExtra("isPlaying", lastPlaying)
        putExtra("isFavorite", isFavorite)
      }
      service.sendBroadcast(intent)
    } catch (_: Exception) {}
  }

  private fun persistWidgetArtworkAsync(src: Bitmap) {
    if (src.isRecycled || widgetCoverExecutor.isShutdown) return
    if (!XmusicWidgetUpdater.hasActiveWidgets(service.applicationContext)) return
    try {
      val scaled = Bitmap.createScaledBitmap(src, 192, 192, true)
      widgetCoverExecutor.execute {
        try {
          if (XmusicWidgetUpdater.persistCoverBitmap(service.applicationContext, scaled)) {
            broadcastWidgetState()
          }
        } catch (_: Exception) {
        } finally {
          if (scaled != src && !scaled.isRecycled) {
            scaled.recycle()
          }
        }
      }
    } catch (_: Exception) {}
  }
}
