package cn.toside.music.mobile.view

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class LinearGradientViewManager : SimpleViewManager<LinearGradientView>() {
  companion object {
    const val REACT_CLASS = "XmusicLinearGradientView"
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): LinearGradientView =
    LinearGradientView(reactContext)

  @ReactProp(name = "colors")
  fun setColors(view: LinearGradientView, colors: ReadableArray?) {
    if (colors == null || colors.size() < 2) return
    val parsed = IntArray(colors.size()) { i -> colors.getDouble(i).toLong().toInt() }
    view.setColors(parsed)
  }

  @ReactProp(name = "locations")
  fun setLocations(view: LinearGradientView, locations: ReadableArray?) {
    if (locations == null || locations.size() < 2) {
      view.setLocations(null)
      return
    }
    val parsed = FloatArray(locations.size()) { i -> locations.getDouble(i).toFloat() }
    view.setLocations(parsed)
  }
}
