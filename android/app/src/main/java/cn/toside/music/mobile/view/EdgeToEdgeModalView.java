package cn.toside.music.mobile.view;

import android.content.Context;
import android.view.View;

public class EdgeToEdgeModalView extends View {
  public EdgeToEdgeModalView(Context context) {
    super(context);
  }

  @Override
  protected void onAttachedToWindow() {
    super.onAttachedToWindow();
    View root = getRootView();
    if (root != null) {
      int flags = root.getSystemUiVisibility()
        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
      root.setSystemUiVisibility(flags);
      root.requestApplyInsets();
    }
  }
}
