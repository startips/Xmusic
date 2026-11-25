package cn.toside.music.mobile.view;

import androidx.annotation.NonNull;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class WavyProgressViewManager extends SimpleViewManager<WavyProgressView> {
  public static final String REACT_CLASS = "XmusicWavyProgressView";

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected WavyProgressView createViewInstance(@NonNull ThemedReactContext reactContext) {
    return new WavyProgressView(reactContext);
  }

  @ReactProp(name = "progress", defaultFloat = 0f)
  public void setProgress(WavyProgressView view, float progress) {
    view.setProgress(progress);
  }

  @ReactProp(name = "buffered", defaultFloat = 0f)
  public void setBuffered(WavyProgressView view, float buffered) {
    view.setBuffered(buffered);
  }

  @ReactProp(name = "playing", defaultBoolean = false)
  public void setPlaying(WavyProgressView view, boolean playing) {
    view.setPlaying(playing);
  }

  @ReactProp(name = "dragging", defaultBoolean = false)
  public void setDragging(WavyProgressView view, boolean dragging) {
    view.setDragging(dragging);
  }

  @ReactProp(name = "activeColor", customType = "Color", defaultInt = 0xFF4DAF7C)
  public void setActiveColor(WavyProgressView view, int activeColor) {
    view.setActiveColor(activeColor);
  }

  @ReactProp(name = "bufferedColor", customType = "Color", defaultInt = 0x474DAF7C)
  public void setBufferedColor(WavyProgressView view, int bufferedColor) {
    view.setBufferedColor(bufferedColor);
  }

  @ReactProp(name = "trackColor", customType = "Color", defaultInt = 0x28000000)
  public void setTrackColor(WavyProgressView view, int trackColor) {
    view.setTrackColor(trackColor);
  }

  @ReactProp(name = "amplitude", defaultFloat = 2.3f)
  public void setAmplitude(WavyProgressView view, float amplitude) {
    view.setAmplitude(amplitude);
  }

  @ReactProp(name = "wavelength", defaultFloat = 34f)
  public void setWavelength(WavyProgressView view, float wavelength) {
    view.setWavelength(wavelength);
  }

  @ReactProp(name = "waveSpeed", defaultFloat = 1.8f)
  public void setWaveSpeed(WavyProgressView view, float waveSpeed) {
    view.setWaveSpeed(waveSpeed);
  }

  @ReactProp(name = "strokeWidth", defaultFloat = 3.4f)
  public void setStrokeWidth(WavyProgressView view, float strokeWidth) {
    view.setStrokeWidthDp(strokeWidth);
  }

  @ReactProp(name = "inactiveStrokeWidth", defaultFloat = 3.0f)
  public void setInactiveStrokeWidth(WavyProgressView view, float inactiveStrokeWidth) {
    view.setInactiveStrokeWidthDp(inactiveStrokeWidth);
  }

  @ReactProp(name = "showThumb", defaultBoolean = true)
  public void setShowThumb(WavyProgressView view, boolean showThumb) {
    view.setShowThumb(showThumb);
  }

  @ReactProp(name = "thumbGap", defaultFloat = 5.5f)
  public void setThumbGap(WavyProgressView view, float thumbGap) {
    view.setThumbGapDp(thumbGap);
  }

  @ReactProp(name = "thumbWidth", defaultFloat = 4.5f)
  public void setThumbWidth(WavyProgressView view, float thumbWidth) {
    view.setThumbWidthDp(thumbWidth);
  }

  @ReactProp(name = "thumbHeight", defaultFloat = 17f)
  public void setThumbHeight(WavyProgressView view, float thumbHeight) {
    view.setThumbHeightDp(thumbHeight);
  }
}
