package cn.toside.music.mobile.widget;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

import cn.toside.music.mobile.MainActivity;

public class XmusicWidgetActionReceiver extends BroadcastReceiver {
  private static final String ACTION_STATE_CHANGED = "com.startips.xmusic.WIDGET_STATE_CHANGED";
  private static final String MUSIC_SERVICE_CLASS = "cn.toside.music.mobile.player.XmusicPlaybackService";

  @Override
  public void onReceive(Context context, Intent intent) {
    if (context == null || intent == null || intent.getAction() == null) return;
    final String action = intent.getAction();

    if (ACTION_STATE_CHANGED.equals(action)) {
      String title = intent.hasExtra("title") ? intent.getStringExtra("title") : null;
      String artist = intent.hasExtra("artist") ? intent.getStringExtra("artist") : null;
      Boolean isPlaying = intent.hasExtra("isPlaying") ? intent.getBooleanExtra("isPlaying", false) : null;
      Boolean isFavorite = intent.hasExtra("isFavorite") ? intent.getBooleanExtra("isFavorite", false) : null;
      XmusicWidgetUpdater.savePartialState(context, title, artist, null, isPlaying, isFavorite, null);
      return;
    }

    String serviceAction = null;
    if (XmusicWidgetUpdater.ACTION_PLAY_PAUSE.equals(action)) {
      serviceAction = "xmusic_widget_play_pause";
    } else if (XmusicWidgetUpdater.ACTION_PREV.equals(action)) {
      serviceAction = "xmusic_widget_prev";
    } else if (XmusicWidgetUpdater.ACTION_NEXT.equals(action)) {
      serviceAction = "xmusic_widget_next";
    } else if (XmusicWidgetUpdater.ACTION_FAVORITE.equals(action)) {
      serviceAction = "xmusic_toggle_favorite";
    }
    if (serviceAction == null) return;

    try {
      Intent svc = new Intent();
      svc.setComponent(new ComponentName(context.getPackageName(), MUSIC_SERVICE_CLASS));
      svc.setAction(serviceAction);
      context.startService(svc);
    } catch (Exception e) {
      // App process was cold-killed in background on Android 12+; wake MainActivity cleanly
      try {
        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launch);
      } catch (Exception ignored) {}
    }
  }
}
