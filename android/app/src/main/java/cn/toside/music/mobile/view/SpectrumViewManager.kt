package cn.toside.music.mobile.view

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class SpectrumViewManager : SimpleViewManager<SpectrumView>() {
  companion object {
    const val REACT_CLASS = "XmusicSpectrumView"
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): SpectrumView =
    SpectrumView(reactContext)

  @ReactProp(name = "mode")
  fun setMode(view: SpectrumView, mode: String?) {
    view.setMode(mode)
  }

  @ReactProp(name = "playing", defaultBoolean = false)
  fun setPlaying(view: SpectrumView, playing: Boolean) {
    view.setPlaying(playing)
  }

  @ReactProp(name = "primaryColor")
  fun setPrimaryColor(view: SpectrumView, color: Double) {
    view.setPrimaryColorValue(color.toLong().toInt())
  }

  @ReactProp(name = "secondaryColor")
  fun setSecondaryColor(view: SpectrumView, color: Double) {
    view.setSecondaryColorValue(color.toLong().toInt())
  }

  @ReactProp(name = "tertiaryColor")
  fun setTertiaryColor(view: SpectrumView, color: Double) {
    view.setTertiaryColorValue(color.toLong().toInt())
  }

  @ReactProp(name = "intensity", defaultFloat = 1.0f)
  fun setIntensity(view: SpectrumView, intensity: Float) {
    view.setIntensityValue(intensity)
  }
}
