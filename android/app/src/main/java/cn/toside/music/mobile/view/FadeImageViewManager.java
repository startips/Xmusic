package cn.toside.music.mobile.view;

import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.views.image.ReactImageManager;
import com.facebook.react.views.image.ReactImageView;

@ReactModule(name = FadeImageViewManager.REACT_CLASS)
public class FadeImageViewManager extends ReactImageManager {
  public static final String REACT_CLASS = "XmusicFadeImageView";

  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @Override
  public ReactImageView createViewInstance(ThemedReactContext context) {
    return new FadeImageView(context, getDraweeControllerBuilder(), null, getCallerContext());
  }

  @ReactProp(name = "topFadeStart", defaultFloat = 0.04f)
  public void setTopFadeStart(ReactImageView view, float start) {
    if (view instanceof FadeImageView) {
      ((FadeImageView) view).setTopFadeStart(start);
    }
  }

  @ReactProp(name = "topFadeEnd", defaultFloat = 0.22f)
  public void setTopFadeEnd(ReactImageView view, float end) {
    if (view instanceof FadeImageView) {
      ((FadeImageView) view).setTopFadeEnd(end);
    }
  }

  @ReactProp(name = "fadeStart", defaultFloat = 0.54f)
  public void setFadeStart(ReactImageView view, float start) {
    if (view instanceof FadeImageView) {
      ((FadeImageView) view).setFadeStart(start);
    }
  }

  @ReactProp(name = "fadeEnd", defaultFloat = 0.98f)
  public void setFadeEnd(ReactImageView view, float end) {
    if (view instanceof FadeImageView) {
      ((FadeImageView) view).setFadeEnd(end);
    }
  }

  @ReactProp(name = "startCornerRadius", defaultFloat = 12f)
  public void setStartCornerRadius(ReactImageView view, float radiusDp) {
    if (view instanceof FadeImageView) {
      ((FadeImageView) view).setStartCornerRadius(radiusDp);
    }
  }
}
