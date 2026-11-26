package cn.toside.music.mobile.view

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

class EdgeSwipeViewManager : ViewGroupManager<EdgeSwipeView>() {
  companion object {
    const val REACT_CLASS = "XmusicEdgeSwipeView"
    const val EVENT_EDGE_DISMISS = "topEdgeDismiss"
    const val COMMAND_PREPARE_MINIMIZE = 1
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): EdgeSwipeView =
    EdgeSwipeView(reactContext)

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    MapBuilder.of(
      EVENT_EDGE_DISMISS,
      MapBuilder.of("registrationName", "onEdgeDismiss"),
    )

  override fun getCommandsMap(): MutableMap<String, Int> =
    MapBuilder.of("prepareMinimize", COMMAND_PREPARE_MINIMIZE)

  @Deprecated("Deprecated in Java")
  override fun receiveCommand(root: EdgeSwipeView, commandId: Int, args: ReadableArray?) {
    if (commandId == COMMAND_PREPARE_MINIMIZE) {
      root.prepareMinimize()
    }
  }

  override fun receiveCommand(root: EdgeSwipeView, commandId: String, args: ReadableArray?) {
    if (commandId == "prepareMinimize") {
      root.prepareMinimize()
    }
  }

  @ReactProp(name = "edgeWidth", defaultFloat = 42.0f)
  fun setEdgeWidth(view: EdgeSwipeView, edgeWidth: Float) {
    view.setEdgeWidth(edgeWidth)
  }

  @ReactProp(name = "dismissDistance", defaultFloat = 64.0f)
  fun setDismissDistance(view: EdgeSwipeView, dismissDistance: Float) {
    view.setDismissDistance(dismissDistance)
  }

  @ReactProp(name = "mode")
  fun setMode(view: EdgeSwipeView, mode: String?) {
    view.setMode(mode)
  }

  @ReactProp(name = "swipeEnabled", defaultBoolean = true)
  fun setSwipeEnabled(view: EdgeSwipeView, swipeEnabled: Boolean) {
    view.setSwipeEnabled(swipeEnabled)
  }
}
