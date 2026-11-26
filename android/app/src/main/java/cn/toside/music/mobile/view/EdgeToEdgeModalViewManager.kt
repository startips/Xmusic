package cn.toside.music.mobile.view

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class EdgeToEdgeModalViewManager : SimpleViewManager<EdgeToEdgeModalView>() {
  companion object {
    const val REACT_CLASS = "XmusicEdgeToEdgeModalView"
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): EdgeToEdgeModalView =
    EdgeToEdgeModalView(reactContext)

  @ReactProp(name = "darkStatusBarIcons", defaultBoolean = false)
  fun setDarkStatusBarIcons(view: EdgeToEdgeModalView, darkStatusBarIcons: Boolean) {
    view.setDarkStatusBarIcons(darkStatusBarIcons)
  }
}
