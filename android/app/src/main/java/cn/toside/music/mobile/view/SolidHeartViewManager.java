package cn.toside.music.mobile.view;

import androidx.annotation.NonNull;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class SolidHeartViewManager extends SimpleViewManager<SolidHeartView> {
  public static final String REACT_CLASS = "XmusicSolidHeartView";

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected SolidHeartView createViewInstance(@NonNull ThemedReactContext reactContext) {
    return new SolidHeartView(reactContext);
  }

  @ReactProp(name = "color", customType = "Color", defaultInt = 0xFF4DAF7C)
  public void setColor(SolidHeartView view, int color) {
    view.setHeartColor(color);
  }
}
