package cn.toside.music.mobile.view;

import androidx.annotation.NonNull;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;

public class EdgeToEdgeModalViewManager extends SimpleViewManager<EdgeToEdgeModalView> {
  public static final String REACT_CLASS = "XmusicEdgeToEdgeModalView";

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected EdgeToEdgeModalView createViewInstance(@NonNull ThemedReactContext reactContext) {
    return new EdgeToEdgeModalView(reactContext);
  }
}
