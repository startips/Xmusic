package cn.toside.music.mobile.utils

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Process
import android.util.Log
import androidx.core.app.LocaleManagerCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.util.Locale
import kotlin.system.exitProcess

class DevicePermissionHelper(
  private val reactContext: ReactApplicationContext,
  private val scope: CoroutineScope,
) {
  companion object {
    private const val TAG = "Utils"
  }

  fun exitApp() {
    val currentActivity = reactContext.currentActivity
    Log.d(TAG, "Exit app...")
    if (currentActivity == null) {
      Log.d(TAG, "killProcess")
      Process.killProcess(Process.myPid())
    } else {
      currentActivity.finishAndRemoveTask()
      exitProcess(0)
    }
  }

  fun getSupportedAbis(promise: Promise) {
    val array = Arguments.createArray()
    for (abi in Build.SUPPORTED_ABIS) {
      array.pushString(abi)
    }
    promise.resolve(array)
  }

  fun installApk(filePath: String, fileProviderAuthority: String, promise: Promise) {
    val file = File(filePath)
    if (!file.exists()) {
      Log.e(TAG, "installApk: file does not exist '$filePath'")
      promise.reject("Utils", "installApk: file does not exist '$filePath'")
      return
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      val contentUri = try {
        FileProvider.getUriForFile(reactContext, fileProviderAuthority, file)
      } catch (e: Exception) {
        Log.e(TAG, "installApk exception with authority name '$fileProviderAuthority'", e)
        promise.reject("Utils", "installApk exception with authority name '$fileProviderAuthority'")
        return
      }
      @Suppress("DEPRECATION")
      val installApp = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        data = contentUri
        putExtra(Intent.EXTRA_INSTALLER_PACKAGE_NAME, reactContext.applicationInfo.packageName)
      }
      reactContext.startActivity(installApp)
      promise.resolve(null)
    } else {
      try {
        Runtime.getRuntime().exec("chmod 777 $file")
      } catch (e: Exception) {
        Log.e(TAG, "installApk exception : ${e.message}", e)
        promise.reject("Utils", e.message)
        return
      }
      val intent = Intent(Intent.ACTION_VIEW).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        setDataAndType(Uri.parse("file://$file"), "application/vnd.android.package-archive")
      }
      reactContext.startActivity(intent)
      promise.resolve(null)
    }
  }

  fun getWifiIpv4Address(promise: Promise) {
    val wifi = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    scope.launch(Dispatchers.IO) {
      try {
        @Suppress("DEPRECATION")
        val ipAddress = wifi?.connectionInfo?.ipAddress ?: 0
        @SuppressLint("DefaultLocale")
        val stringIp = String.format(
          "%d.%d.%d.%d",
          ipAddress and 0xff,
          ipAddress shr 8 and 0xff,
          ipAddress shr 16 and 0xff,
          ipAddress shr 24 and 0xff,
        )
        promise.resolve(stringIp)
      } catch (_: Exception) {
        promise.resolve(null)
      }
    }
  }

  fun getDeviceName(promise: Promise) {
    val manufacturer = Build.MANUFACTURER ?: ""
    val model = Build.MODEL ?: ""
    if (model.startsWith(manufacturer)) {
      promise.resolve(capitalize(model))
    } else {
      promise.resolve("${capitalize(manufacturer)} $model")
    }
  }

  private fun capitalize(s: String?): String {
    if (s.isNullOrEmpty()) return ""
    val first = s[0]
    return if (first.isUpperCase()) s else first.uppercaseChar() + s.substring(1)
  }

  fun isNotificationsEnabled(promise: Promise) {
    scope.launch(Dispatchers.IO) {
      promise.resolve(NotificationPermissionUtil.isNotificationsEnabled(reactContext.applicationContext))
    }
  }

  fun openNotificationPermissionActivity(promise: Promise) {
    scope.launch(Dispatchers.IO) {
      promise.resolve(NotificationPermissionUtil.openNotificationPermissionActivity(reactContext.applicationContext))
    }
  }

  fun shareText(shareTitle: String?, title: String?, text: String?) {
    val shareIntent = Intent(Intent.ACTION_SEND).apply {
      type = "text/plain"
      putExtra(Intent.EXTRA_TEXT, text)
      putExtra(Intent.EXTRA_SUBJECT, title)
    }
    val chooser = Intent.createChooser(shareIntent, shareTitle)
    val activity = reactContext.currentActivity
    if (activity != null) {
      activity.startActivity(chooser)
    } else {
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(chooser)
    }
  }

  fun getSystemLocales(promise: Promise) {
    val locale: Locale? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val list = LocaleManagerCompat.getSystemLocales(reactContext)
      if (!list.isEmpty) {
        list[0]
      } else {
        promise.resolve(null)
        return
      }
    } else {
      Locale.getDefault()
    }
    if (locale == null) {
      promise.resolve("")
      return
    }
    val language = locale.language.lowercase()
    val country = locale.country.lowercase()
    promise.resolve(if (country.isNotEmpty()) "${language}_${country}" else language)
  }

  fun isIgnoringBatteryOptimization(promise: Promise) {
    scope.launch(Dispatchers.IO) {
      val result = BatteryOptimizationUtil.isIgnoringBatteryOptimization(
        reactContext.applicationContext,
        reactContext.packageName,
      )
      promise.resolve(result)
    }
  }

  fun requestIgnoreBatteryOptimization(promise: Promise) {
    scope.launch(Dispatchers.IO) {
      try {
        val result = BatteryOptimizationUtil.requestIgnoreBatteryOptimization(
          reactContext.applicationContext,
          reactContext.packageName,
        )
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("ERROR", e)
      }
    }
  }
}
