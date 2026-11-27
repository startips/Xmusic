package cn.toside.music.mobile.view

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class FluidBgViewManager : SimpleViewManager<FluidBgView>() {
  companion object {
    const val REACT_CLASS = "XmusicFluidBgView"
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): FluidBgView =
    FluidBgView(reactContext)

  @ReactProp(name = "baseColor")
  fun setBaseColor(view: FluidBgView, baseColor: Double) {
    view.setBaseColorValue(baseColor.toLong().toInt())
  }

  @ReactProp(name = "colors")
  fun setColors(view: FluidBgView, colors: ReadableArray?) {
    if (colors == null || colors.size() == 0) return
    val parsed = IntArray(colors.size()) { i -> colors.getDouble(i).toLong().toInt() }
    view.setOrbColors(parsed)
  }

  @ReactProp(name = "playing", defaultBoolean = false)
  fun setPlaying(view: FluidBgView, playing: Boolean) {
    view.setPlaying(playing)
  }

  @ReactProp(name = "audioReactive", defaultBoolean = false)
  fun setAudioReactive(view: FluidBgView, audioReactive: Boolean) {
    view.setAudioReactive(audioReactive)
  }
}
