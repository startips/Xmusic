package cn.toside.music.mobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

class XmusicCardWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    XmusicWidgetUpdater.updateCardWidgets(context, appWidgetManager, appWidgetIds)
  }
}
