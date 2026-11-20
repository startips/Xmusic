package cn.toside.music.mobile.view;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class LinearGradientViewManager extends SimpleViewManager<LinearGradientView> {
  public static final String REACT_CLASS = "XmusicLinearGradientView";

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected LinearGradientView createViewInstance(@NonNull ThemedReactContext reactContext) {
    return new LinearGradientView(reactContext);
  }

  @ReactProp(name = "colors")
  public void setColors(LinearGradientView view, @Nullable ReadableArray colors) {
    if (colors == null || colors.size() < 2) return;
    int[] parsed = new int[colors.size()];
    for (int i = 0; i < colors.size(); i++) {
      parsed[i] = (int) (long) colors.getDouble(i);
    }
    view.setColors(parsed);
  }

  @ReactProp(name = "locations")
  public void setLocations(LinearGradientView view, @Nullable ReadableArray locations) {
    if (locations == null || locations.size() < 2) {
      view.setLocations(null);
      return;
    }
    float[] parsed = new float[locations.size()];
    for (int i = 0; i < locations.size(); i++) {
      parsed[i] = (float) locations.getDouble(i);
    }
    view.setLocations(parsed);
  }
}
