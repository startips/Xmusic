package cn.toside.music.mobile.view

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class XmusicViewPackage : ReactPackage {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf(
      AlphaFadeViewManager(),
      FadeImageViewManager(),
      LinearGradientViewManager(),
      SolidHeartViewManager(),
      EdgeSwipeViewManager(),
      EdgeToEdgeModalViewManager(),
      FluidBgViewManager(),
      WavyProgressViewManager(),
    )

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    emptyList()
}
