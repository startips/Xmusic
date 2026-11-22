package cn.toside.music.mobile.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class XmusicCardWidgetProvider extends AppWidgetProvider {
  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    XmusicWidgetUpdater.updateCardWidgets(context, appWidgetManager, appWidgetIds);
  }
}
