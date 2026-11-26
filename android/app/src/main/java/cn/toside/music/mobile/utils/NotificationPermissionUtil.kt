package cn.toside.music.mobile.utils

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationManagerCompat

object NotificationPermissionUtil {
  private const val TAG = "NotificationUtil"

  @JvmStatic
  fun isNotificationsEnabled(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return false
      if (!manager.areNotificationsEnabled()) return false
      try {
        val channels = manager.notificationChannels
        if (channels != null) {
          for (channel in channels) {
            if (channel.importance == NotificationManager.IMPORTANCE_NONE) {
              return false
            }
          }
        }
      } catch (e: Exception) {
        Log.w(TAG, "Error reading notification channels", e)
      }
      return true
    }
    return NotificationManagerCompat.from(context).areNotificationsEnabled()
  }

  @JvmStatic
  fun openNotificationPermissionActivity(context: Context): Boolean {
    val packageName = context.packageName
    val intent = Intent().apply {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
        putExtra("android.provider.extra.APP_PACKAGE", packageName)
      } else {
        action = "android.settings.APP_NOTIFICATION_SETTINGS"
        putExtra("app_package", packageName)
        putExtra("app_uid", context.applicationInfo.uid)
      }
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    val infos = context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
    if (infos.isEmpty()) {
      Log.w(TAG, "No activity found to handle notification settings intent")
      return false
    }

    return try {
      context.startActivity(intent)
      true
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start notification settings", e)
      false
    }
  }
}
