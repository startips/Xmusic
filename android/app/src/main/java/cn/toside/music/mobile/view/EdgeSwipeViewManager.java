package cn.toside.music.mobile.view;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

public class EdgeSwipeViewManager extends ViewGroupManager<EdgeSwipeView> {
  public static final String REACT_CLASS = "XmusicEdgeSwipeView";
  public static final String EVENT_EDGE_DISMISS = "topEdgeDismiss";
  public static final int COMMAND_PREPARE_MINIMIZE = 1;

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected EdgeSwipeView createViewInstance(@NonNull ThemedReactContext reactContext) {
    return new EdgeSwipeView(reactContext);
  }

  @Nullable
  @Override
  public Map<String, Object> getExportedCustomDirectEventTypeConstants() {
    return MapBuilder.of(
      EVENT_EDGE_DISMISS,
      MapBuilder.of("registrationName", "onEdgeDismiss")
    );
  }

  @Nullable
  @Override
  public Map<String, Integer> getCommandsMap() {
    return MapBuilder.of("prepareMinimize", COMMAND_PREPARE_MINIMIZE);
  }

  @Override
  public void receiveCommand(@NonNull EdgeSwipeView root, int commandId, @Nullable ReadableArray args) {
    if (commandId == COMMAND_PREPARE_MINIMIZE) {
      root.prepareMinimize();
    }
  }

  @Override
  public void receiveCommand(@NonNull EdgeSwipeView root, String commandId, @Nullable ReadableArray args) {
    if ("prepareMinimize".equals(commandId)) {
      root.prepareMinimize();
    }
  }

  @ReactProp(name = "edgeWidth", defaultFloat = 42.0f)
  public void setEdgeWidth(EdgeSwipeView view, float edgeWidth) {
    view.setEdgeWidth(edgeWidth);
  }

  @ReactProp(name = "dismissDistance", defaultFloat = 64.0f)
  public void setDismissDistance(EdgeSwipeView view, float dismissDistance) {
    view.setDismissDistance(dismissDistance);
  }
}
