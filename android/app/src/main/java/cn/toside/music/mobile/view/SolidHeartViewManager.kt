package cn.toside.music.mobile.view

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class SolidHeartViewManager : SimpleViewManager<SolidHeartView>() {
  companion object {
    const val REACT_CLASS = "XmusicSolidHeartView"
    private const val DEFAULT_HEART_COLOR = 0xFF4DAF7C.toInt()
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): SolidHeartView =
    SolidHeartView(reactContext)

  @ReactProp(name = "color", customType = "Color", defaultInt = DEFAULT_HEART_COLOR)
  fun setColor(view: SolidHeartView, color: Int) {
    view.setHeartColor(color)
  }
}
