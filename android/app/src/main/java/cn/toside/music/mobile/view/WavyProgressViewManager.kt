package cn.toside.music.mobile.view

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class WavyProgressViewManager : SimpleViewManager<WavyProgressView>() {
  companion object {
    const val REACT_CLASS = "XmusicWavyProgressView"
    private const val DEFAULT_ACTIVE_COLOR = 0xFF4DAF7C.toInt()
    private const val DEFAULT_BUFFERED_COLOR = 0x474DAF7C
    private const val DEFAULT_TRACK_COLOR = 0x28000000
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): WavyProgressView =
    WavyProgressView(reactContext)

  @ReactProp(name = "progress", defaultFloat = 0f)
  fun setProgress(view: WavyProgressView, progress: Float) {
    view.setProgress(progress)
  }

  @ReactProp(name = "buffered", defaultFloat = 0f)
  fun setBuffered(view: WavyProgressView, buffered: Float) {
    view.setBuffered(buffered)
  }

  @ReactProp(name = "playing", defaultBoolean = false)
  fun setPlaying(view: WavyProgressView, playing: Boolean) {
    view.setPlaying(playing)
  }

  @ReactProp(name = "dragging", defaultBoolean = false)
  fun setDragging(view: WavyProgressView, dragging: Boolean) {
    view.setDragging(dragging)
  }

  @ReactProp(name = "activeColor", customType = "Color", defaultInt = DEFAULT_ACTIVE_COLOR)
  fun setActiveColor(view: WavyProgressView, activeColor: Int) {
    view.setActiveColor(activeColor)
  }

  @ReactProp(name = "bufferedColor", customType = "Color", defaultInt = DEFAULT_BUFFERED_COLOR)
  fun setBufferedColor(view: WavyProgressView, bufferedColor: Int) {
    view.setBufferedColor(bufferedColor)
  }

  @ReactProp(name = "trackColor", customType = "Color", defaultInt = DEFAULT_TRACK_COLOR)
  fun setTrackColor(view: WavyProgressView, trackColor: Int) {
    view.setTrackColor(trackColor)
  }

  @ReactProp(name = "amplitude", defaultFloat = 2.3f)
  fun setAmplitude(view: WavyProgressView, amplitude: Float) {
    view.setAmplitude(amplitude)
  }

  @ReactProp(name = "wavelength", defaultFloat = 34f)
  fun setWavelength(view: WavyProgressView, wavelength: Float) {
    view.setWavelength(wavelength)
  }

  @ReactProp(name = "waveSpeed", defaultFloat = 1.8f)
  fun setWaveSpeed(view: WavyProgressView, waveSpeed: Float) {
    view.setWaveSpeed(waveSpeed)
  }

  @ReactProp(name = "strokeWidth", defaultFloat = 3.4f)
  fun setStrokeWidth(view: WavyProgressView, strokeWidth: Float) {
    view.setStrokeWidthDp(strokeWidth)
  }

  @ReactProp(name = "inactiveStrokeWidth", defaultFloat = 3.0f)
  fun setInactiveStrokeWidth(view: WavyProgressView, inactiveStrokeWidth: Float) {
    view.setInactiveStrokeWidthDp(inactiveStrokeWidth)
  }

  @ReactProp(name = "showThumb", defaultBoolean = true)
  fun setShowThumb(view: WavyProgressView, showThumb: Boolean) {
    view.setShowThumb(showThumb)
  }

  @ReactProp(name = "thumbGap", defaultFloat = 5.5f)
  fun setThumbGap(view: WavyProgressView, thumbGap: Float) {
    view.setThumbGapDp(thumbGap)
  }

  @ReactProp(name = "thumbWidth", defaultFloat = 4.5f)
  fun setThumbWidth(view: WavyProgressView, thumbWidth: Float) {
    view.setThumbWidthDp(thumbWidth)
  }

  @ReactProp(name = "thumbHeight", defaultFloat = 17f)
  fun setThumbHeight(view: WavyProgressView, thumbHeight: Float) {
    view.setThumbHeightDp(thumbHeight)
  }
}
