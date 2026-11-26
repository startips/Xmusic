package cn.toside.music.mobile.utils

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

object BatteryOptimizationUtil {
  private const val TAG = "BatteryOptimizationUtil"

  @JvmStatic
  fun isIgnoringBatteryOptimization(context: Context, packageName: String): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      return pm?.isIgnoringBatteryOptimizations(packageName) == true
    }
    return true
  }

  @JvmStatic
  fun requestIgnoreBatteryOptimization(context: Context, packageName: String): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return true
    }

    val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    if (pm != null && pm.isIgnoringBatteryOptimizations(packageName)) {
      return true
    }

    @SuppressLint("BatteryLife")
    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
      data = Uri.parse("package:$packageName")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    val resolveInfos = context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
    if (resolveInfos.isEmpty()) {
      Log.w(TAG, "No Activity found to handle ignore battery optimization intent")
      return false
    }

    return try {
      context.startActivity(intent)
      true
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start ignore battery optimization intent", e)
      false
    }
  }
}
