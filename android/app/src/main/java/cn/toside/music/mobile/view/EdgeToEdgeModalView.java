package cn.toside.music.mobile.view;

import android.content.Context;
import android.os.Build;
import android.view.View;
import android.view.WindowInsetsController;

public class EdgeToEdgeModalView extends View {
  private boolean darkStatusBarIcons = false;

  public EdgeToEdgeModalView(Context context) {
    super(context);
  }

  public void setDarkStatusBarIcons(boolean darkStatusBarIcons) {
    if (this.darkStatusBarIcons == darkStatusBarIcons) return;
    this.darkStatusBarIcons = darkStatusBarIcons;
    applySystemUiFlags();
  }

  private void applySystemUiFlags() {
    View root = getRootView();
    if (root == null) return;
    int flags = root.getSystemUiVisibility()
      | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      if (darkStatusBarIcons) {
        flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
      } else {
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
      }
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (darkStatusBarIcons) {
        flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      } else {
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      }
    }
    root.setSystemUiVisibility(flags);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      WindowInsetsController controller = root.getWindowInsetsController();
      if (controller != null) {
        int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
          | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
        controller.setSystemBarsAppearance(darkStatusBarIcons ? mask : 0, mask);
      }
    }
    root.requestApplyInsets();
  }

  @Override
  protected void onAttachedToWindow() {
    super.onAttachedToWindow();
    applySystemUiFlags();
  }
}
