package cn.toside.music.mobile.player

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Process
import android.support.v4.media.session.PlaybackStateCompat
import androidx.media.session.MediaButtonReceiver
import androidx.media3.common.util.UnstableApi
import cn.toside.music.mobile.player.session.XmusicMediaNotificationManager

/**
 * Foreground media playback service owning [XmusicPlayerController] and MediaSession.
 */
@UnstableApi
class XmusicPlaybackService : Service() {

  inner class LocalBinder : Binder() {
    val controller: XmusicPlayerController
      get() = ensureController()

    fun post(action: () -> Unit) {
      mainHandler.post(action)
    }
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private val binder = LocalBinder()
  private var controller: XmusicPlayerController? = null

  private fun ensureController(): XmusicPlayerController {
    return controller ?: XmusicPlayerController(this).also { controller = it }
  }

  override fun onCreate() {
    super.onCreate()
    val ctrl = ensureController()
    val placeholder = ctrl.notificationManager.buildPlaceholderNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        XmusicMediaNotificationManager.NOTIFICATION_ID,
        placeholder,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(XmusicMediaNotificationManager.NOTIFICATION_ID, placeholder)
    }
  }

  override fun onBind(intent: Intent?): IBinder {
    ensureController()
    return binder
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val action = intent?.action
    if (action == XmusicMediaNotificationManager.ACTION_TOGGLE_FAVORITE) {
      if (controller == null || !ensureController().notificationManager.session.isActive) {
        stopIfColdStart()
        return START_NOT_STICKY
      }
      XmusicPlayerEventBus.emit("remote-toggle-favorite")
      return START_NOT_STICKY
    }

    if (action != null && action.startsWith("xmusic_widget_")) {
      val ctrl = controller
      if (ctrl == null || !ctrl.notificationManager.session.isActive) {
        stopIfColdStart()
        return START_NOT_STICKY
      }
      when (action) {
        "xmusic_widget_play_pause" -> {
          val playing = ctrl.getState() == PlaybackStateCompat.STATE_PLAYING
          XmusicPlayerEventBus.emit(if (playing) "remote-pause" else "remote-play")
        }
        "xmusic_widget_prev" -> XmusicPlayerEventBus.emit("remote-previous")
        "xmusic_widget_next" -> XmusicPlayerEventBus.emit("remote-next")
      }
      return START_NOT_STICKY
    }

    if (action == Intent.ACTION_MEDIA_BUTTON) {
      val ctrl = controller
      if (ctrl == null || !ctrl.notificationManager.session.isActive) {
        stopIfColdStart()
      } else {
        MediaButtonReceiver.handleIntent(ctrl.notificationManager.session, intent)
      }
      return START_NOT_STICKY
    }

    ensureController()
    return START_NOT_STICKY
  }

  private fun stopIfColdStart() {
    val active = controller?.notificationManager?.session?.isActive == true
    if (!active) {
      stopSelf()
    }
  }

  override fun onDestroy() {
    mainHandler.removeCallbacksAndMessages(null)
    controller?.destroy()
    controller = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    super.onDestroy()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    val ctrl = controller
    if (ctrl == null || ctrl.shouldStopWithApp()) {
      ctrl?.stop()
      ctrl?.destroy()
      controller = null
      stopSelf()
      Process.killProcess(Process.myPid())
    }
  }
}
