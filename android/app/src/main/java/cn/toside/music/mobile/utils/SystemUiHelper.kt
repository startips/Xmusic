package cn.toside.music.mobile.utils

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Rect
import android.hardware.display.DisplayManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Display
import android.view.HapticFeedbackConstants
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import cn.toside.music.mobile.core.emitDeviceEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import kotlin.math.max

class SystemUiHelper(
  private val reactContext: ReactApplicationContext,
) {
  companion object {
    private const val EVENT_SCREEN_STATE = "screen-state"
    private const val EVENT_DISPLAY_CHANGED = "display-changed"
  }

  private var screenOnOffReceiver: BroadcastReceiver? = null
  private var displayManager: DisplayManager? = null
  private var displayListener: DisplayManager.DisplayListener? = null
  private var lastDisplayRotation: Int = -1

  fun registerListeners() {
    registerScreenBroadcastReceiver()
    registerDisplayListener()
  }

  fun unregisterListeners() {
    screenOnOffReceiver?.let {
      try { reactContext.unregisterReceiver(it) } catch (_: Exception) {}
      screenOnOffReceiver = null
    }
    val dm = displayManager
    val dl = displayListener
    if (dm != null && dl != null) {
      try { dm.unregisterDisplayListener(dl) } catch (_: Exception) {}
      displayListener = null
    }
  }

  private fun registerDisplayListener() {
    try {
      val dm = reactContext.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager ?: return
      displayManager = dm
      dm.getDisplay(Display.DEFAULT_DISPLAY)?.let { lastDisplayRotation = it.rotation }
      val listener = object : DisplayManager.DisplayListener {
        override fun onDisplayAdded(displayId: Int) {}
        override fun onDisplayRemoved(displayId: Int) {}
        override fun onDisplayChanged(displayId: Int) {
          if (displayId != Display.DEFAULT_DISPLAY) return
          val display = dm.getDisplay(displayId) ?: return
          val rotation = display.rotation
          if (rotation == lastDisplayRotation) return
          lastDisplayRotation = rotation
          val params = Arguments.createMap().apply { putInt("rotation", rotation) }
          reactContext.emitDeviceEvent(EVENT_DISPLAY_CHANGED, params)
        }
      }
      displayListener = listener
      dm.registerDisplayListener(listener, Handler(Looper.getMainLooper()))
    } catch (_: Exception) {}
  }

  private fun registerScreenBroadcastReceiver() {
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_ON)
      addAction(Intent.ACTION_SCREEN_OFF)
    }
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        val action = intent?.action ?: return
        val params = Arguments.createMap()
        when (action) {
          Intent.ACTION_SCREEN_OFF -> {
            params.putString("state", "OFF")
            reactContext.emitDeviceEvent(EVENT_SCREEN_STATE, params)
          }
          Intent.ACTION_SCREEN_ON -> {
            params.putString("state", "ON")
            reactContext.emitDeviceEvent(EVENT_SCREEN_STATE, params)
          }
        }
      }
    }
    screenOnOffReceiver = receiver
    reactContext.registerReceiver(receiver, filter)
  }

  fun screenKeepAwake(keep: Boolean) {
    val activity = reactContext.currentActivity ?: return
    activity.runOnUiThread {
      if (keep) {
        activity.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      } else {
        activity.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      }
    }
  }

  fun performHaptic(type: String?) {
    UiThreadUtil.runOnUiThread {
      val activity = reactContext.currentActivity
      val decor = activity?.window?.decorView

      if (type == "heart" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        @Suppress("DEPRECATION")
        val vibrator = reactContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        if (vibrator != null && vibrator.hasVibrator()) {
          vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK))
          return@runOnUiThread
        }
      }

      if (decor != null) {
        val constant = when (type ?: "light") {
          "tick" -> HapticFeedbackConstants.CLOCK_TICK
          "confirm", "heart" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            HapticFeedbackConstants.CONFIRM
          } else {
            HapticFeedbackConstants.VIRTUAL_KEY
          }
          "heavy" -> HapticFeedbackConstants.LONG_PRESS
          else -> HapticFeedbackConstants.KEYBOARD_TAP
        }
        decor.performHapticFeedback(constant)
      }
    }
  }

  fun getWindowSize(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val params = Arguments.createMap()
      val window = reactContext.currentActivity?.window
      if (window == null) {
        params.putInt("width", 0)
        params.putInt("height", 0)
        promise.resolve(params)
        return@runOnUiThread
      }
      val rect = Rect()
      window.decorView.getWindowVisibleDisplayFrame(rect)
      params.putInt("width", rect.width())
      params.putInt("height", rect.height())
      promise.resolve(params)
    }
  }

  fun getNavigationBarHeight(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val window = reactContext.currentActivity?.window
      if (window == null) {
        promise.resolve(0)
        return@runOnUiThread
      }
      val insets = ViewCompat.getRootWindowInsets(window.decorView)
      if (insets != null) {
        val navInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
        promise.resolve(navInsets.bottom)
        return@runOnUiThread
      }
      val rect = Rect()
      window.decorView.getWindowVisibleDisplayFrame(rect)
      val decorHeight = window.decorView.height
      val navBarHeight = if (decorHeight > 0) max(0, decorHeight - rect.bottom) else 0
      promise.resolve(navBarHeight)
    }
  }

  fun getSafeAreaInsets(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val params = Arguments.createMap()
      val window = reactContext.currentActivity?.window
      if (window == null) {
        params.putInt("top", 0)
        params.putInt("bottom", 0)
        params.putInt("left", 0)
        params.putInt("right", 0)
        params.putBoolean("hasInsets", false)
        promise.resolve(params)
        return@runOnUiThread
      }
      val decorView = window.decorView
      val insets = ViewCompat.getRootWindowInsets(decorView)
      if (insets != null) {
        val safe = insets.getInsets(
          WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
        )
        params.putInt("top", safe.top)
        params.putInt("bottom", safe.bottom)
        params.putInt("left", safe.left)
        params.putInt("right", safe.right)
        params.putBoolean("hasInsets", true)
        promise.resolve(params)
        return@runOnUiThread
      }
      val rect = Rect()
      decorView.getWindowVisibleDisplayFrame(rect)
      val decorW = decorView.width
      val decorH = decorView.height
      params.putInt("top", max(0, rect.top))
      params.putInt("bottom", if (decorH > 0) max(0, decorH - rect.bottom) else 0)
      params.putInt("left", max(0, rect.left))
      params.putInt("right", if (decorW > 0) max(0, decorW - rect.right) else 0)
      params.putBoolean("hasInsets", false)
      promise.resolve(params)
    }
  }
}
