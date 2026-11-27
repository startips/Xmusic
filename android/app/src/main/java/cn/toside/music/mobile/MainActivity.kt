package cn.toside.music.mobile

import android.graphics.Color
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import cn.toside.music.mobile.splash.XmusicSplashController
import com.reactnativenavigation.NavigationActivity

class MainActivity : NavigationActivity() {
  @Suppress("DEPRECATION")
  override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()
    splashScreen.setOnExitAnimationListener { provider ->
      provider.remove()
    }
    window?.let { preWindow ->
      preWindow.statusBarColor = Color.TRANSPARENT
      preWindow.navigationBarColor = Color.TRANSPARENT
    }
    super.onCreate(savedInstanceState)
    volumeControlStream = AudioManager.STREAM_MUSIC
    window?.let { win ->
      WindowCompat.setDecorFitsSystemWindows(win, false)
      win.statusBarColor = Color.TRANSPARENT
      win.navigationBarColor = Color.TRANSPARENT
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        val lp = win.attributes
        lp.layoutInDisplayCutoutMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        } else {
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        win.attributes = lp
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        win.isStatusBarContrastEnforced = false
        win.isNavigationBarContrastEnforced = false
      }
    }
    XmusicSplashController.attachIfColdStart(this, savedInstanceState)
  }

  override fun onDestroy() {
    XmusicSplashController.onActivityDestroyed(this)
    super.onDestroy()
  }
}
