package cn.toside.music.mobile.view;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class FluidBgViewManager extends SimpleViewManager<FluidBgView> {
  public static final String REACT_CLASS = "XmusicFluidBgView";

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected FluidBgView createViewInstance(@NonNull ThemedReactContext reactContext) {
    return new FluidBgView(reactContext);
  }

  @ReactProp(name = "baseColor")
  public void setBaseColor(FluidBgView view, double baseColor) {
    view.setBaseColorValue((int) (long) baseColor);
  }

  @ReactProp(name = "colors")
  public void setColors(FluidBgView view, @Nullable ReadableArray colors) {
    if (colors == null || colors.size() == 0) return;
    int[] parsed = new int[colors.size()];
    for (int i = 0; i < colors.size(); i++) {
      parsed[i] = (int) (long) colors.getDouble(i);
    }
    view.setOrbColors(parsed);
  }

  @ReactProp(name = "playing", defaultBoolean = false)
  public void setPlaying(FluidBgView view, boolean playing) {
    view.setPlaying(playing);
  }
}
