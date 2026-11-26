package cn.toside.music.mobile.view

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.image.ReactImageManager
import com.facebook.react.views.image.ReactImageView

@ReactModule(name = FadeImageViewManager.REACT_CLASS)
class FadeImageViewManager : ReactImageManager() {
  companion object {
    const val REACT_CLASS = "XmusicFadeImageView"
  }

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(context: ThemedReactContext): ReactImageView =
    FadeImageView(context, draweeControllerBuilder, null, callerContext)

  @ReactProp(name = "topFadeStart", defaultFloat = 0.04f)
  fun setTopFadeStart(view: ReactImageView, start: Float) {
    (view as? FadeImageView)?.setTopFadeStart(start)
  }

  @ReactProp(name = "topFadeEnd", defaultFloat = 0.22f)
  fun setTopFadeEnd(view: ReactImageView, end: Float) {
    (view as? FadeImageView)?.setTopFadeEnd(end)
  }

  @ReactProp(name = "fadeStart", defaultFloat = 0.54f)
  fun setFadeStart(view: ReactImageView, start: Float) {
    (view as? FadeImageView)?.setFadeStart(start)
  }

  @ReactProp(name = "fadeEnd", defaultFloat = 0.98f)
  fun setFadeEnd(view: ReactImageView, end: Float) {
    (view as? FadeImageView)?.setFadeEnd(end)
  }

  @ReactProp(name = "startCornerRadius", defaultFloat = 12f)
  fun setStartCornerRadius(view: ReactImageView, radiusDp: Float) {
    (view as? FadeImageView)?.setStartCornerRadius(radiusDp)
  }
}
