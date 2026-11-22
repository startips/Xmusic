package cn.toside.music.mobile.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class XmusicCapsuleWidgetProvider extends AppWidgetProvider {
  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    XmusicWidgetUpdater.updateCapsuleWidgets(context, appWidgetManager, appWidgetIds);
  }
}
