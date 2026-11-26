package cn.toside.music.mobile.view

import android.content.Context
import android.os.Build
import android.view.View
import android.view.WindowInsetsController

class EdgeToEdgeModalView(context: Context) : View(context) {
  private var darkStatusBarIcons = false

  fun setDarkStatusBarIcons(darkStatusBarIcons: Boolean) {
    if (this.darkStatusBarIcons == darkStatusBarIcons) return
    this.darkStatusBarIcons = darkStatusBarIcons
    applySystemUiFlags()
  }

  @Suppress("DEPRECATION")
  private fun applySystemUiFlags() {
    val root = rootView ?: return
    var flags = root.systemUiVisibility or
      SYSTEM_UI_FLAG_LAYOUT_STABLE or
      SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
      SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags = if (darkStatusBarIcons) {
        flags or SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
      } else {
        flags and SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
      }
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      flags = if (darkStatusBarIcons) {
        flags or SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
      } else {
        flags and SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
      }
    }
    root.systemUiVisibility = flags

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      root.windowInsetsController?.let { controller ->
        val mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
          WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        controller.setSystemBarsAppearance(if (darkStatusBarIcons) mask else 0, mask)
      }
    }
    root.requestApplyInsets()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    applySystemUiFlags()
  }
}
