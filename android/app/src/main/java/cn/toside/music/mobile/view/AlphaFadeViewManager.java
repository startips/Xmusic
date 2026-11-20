package cn.toside.music.mobile.view;

import androidx.annotation.NonNull;

import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.annotations.ReactProp;

public class AlphaFadeViewManager extends ViewGroupManager<AlphaFadeView> {
  public static final String REACT_CLASS = "XmusicAlphaFadeView";

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected AlphaFadeView createViewInstance(@NonNull ThemedReactContext reactContext) {
    return new AlphaFadeView(reactContext);
  }

  @ReactProp(name = "topFadeStart", defaultFloat = 0.0f)
  public void setTopFadeStart(AlphaFadeView view, float start) {
    view.setTopFadeStart(start);
  }

  @ReactProp(name = "topFadeEnd", defaultFloat = 0.0f)
  public void setTopFadeEnd(AlphaFadeView view, float end) {
    view.setTopFadeEnd(end);
  }

  @ReactProp(name = "fadeStart", defaultFloat = 0.60f)
  public void setFadeStart(AlphaFadeView view, float start) {
    view.setFadeStart(start);
  }

  @ReactProp(name = "fadeEnd", defaultFloat = 1.0f)
  public void setFadeEnd(AlphaFadeView view, float end) {
    view.setFadeEnd(end);
  }
}
