package cn.toside.music.mobile.widget

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import cn.toside.music.mobile.MainActivity

class XmusicWidgetActionReceiver : BroadcastReceiver() {
  companion object {
    private const val ACTION_STATE_CHANGED = "com.startips.xmusic.WIDGET_STATE_CHANGED"
    private const val MUSIC_SERVICE_CLASS = "cn.toside.music.mobile.player.XmusicPlaybackService"
  }

  override fun onReceive(context: Context?, intent: Intent?) {
    if (context == null || intent == null || intent.action == null) return
    val action = intent.action ?: return

    if (ACTION_STATE_CHANGED == action) {
      val title = if (intent.hasExtra("title")) intent.getStringExtra("title") else null
      val artist = if (intent.hasExtra("artist")) intent.getStringExtra("artist") else null
      val isPlaying = if (intent.hasExtra("isPlaying")) intent.getBooleanExtra("isPlaying", false) else null
      val isFavorite = if (intent.hasExtra("isFavorite")) intent.getBooleanExtra("isFavorite", false) else null
      XmusicWidgetUpdater.savePartialState(context, title, artist, null, isPlaying, isFavorite, null)
      return
    }

    val serviceAction = when (action) {
      XmusicWidgetUpdater.ACTION_PLAY_PAUSE -> "xmusic_widget_play_pause"
      XmusicWidgetUpdater.ACTION_PREV -> "xmusic_widget_prev"
      XmusicWidgetUpdater.ACTION_NEXT -> "xmusic_widget_next"
      XmusicWidgetUpdater.ACTION_FAVORITE -> "xmusic_toggle_favorite"
      else -> null
    } ?: return

    try {
      val svc = Intent().apply {
        component = ComponentName(context.packageName, MUSIC_SERVICE_CLASS)
        this.action = serviceAction
      }
      context.startService(svc)
    } catch (_: Exception) {
      // App process was cold-killed in background on Android 12+; wake MainActivity cleanly
      try {
        val launch = Intent(context, MainActivity::class.java).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        context.startActivity(launch)
      } catch (_: Exception) {}
    }
  }
}
