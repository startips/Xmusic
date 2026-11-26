package cn.toside.music.mobile.view

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

class AlphaFadeViewManager : ViewGroupManager<AlphaFadeView>() {
  companion object {
    const val REACT_CLASS = "XmusicAlphaFadeView"
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): AlphaFadeView =
    AlphaFadeView(reactContext)

  @ReactProp(name = "topFadeStart", defaultFloat = 0.0f)
  fun setTopFadeStart(view: AlphaFadeView, start: Float) {
    view.setTopFadeStart(start)
  }

  @ReactProp(name = "topFadeEnd", defaultFloat = 0.0f)
  fun setTopFadeEnd(view: AlphaFadeView, end: Float) {
    view.setTopFadeEnd(end)
  }

  @ReactProp(name = "fadeStart", defaultFloat = 0.60f)
  fun setFadeStart(view: AlphaFadeView, start: Float) {
    view.setFadeStart(start)
  }

  @ReactProp(name = "fadeEnd", defaultFloat = 1.0f)
  fun setFadeEnd(view: AlphaFadeView, end: Float) {
    view.setFadeEnd(end)
  }
}
