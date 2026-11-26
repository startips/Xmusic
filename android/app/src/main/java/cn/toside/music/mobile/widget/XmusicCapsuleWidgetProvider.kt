package cn.toside.music.mobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

class XmusicCapsuleWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    XmusicWidgetUpdater.updateCapsuleWidgets(context, appWidgetManager, appWidgetIds)
  }
}
