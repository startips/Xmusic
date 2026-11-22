package cn.toside.music.mobile;

import android.graphics.Color;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;

import com.reactnativenavigation.NavigationActivity;

public class MainActivity extends NavigationActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    Window preWindow = getWindow();
    if (preWindow != null) {
      preWindow.setStatusBarColor(Color.TRANSPARENT);
      preWindow.setNavigationBarColor(Color.TRANSPARENT);
    }
    super.onCreate(savedInstanceState);
    setVolumeControlStream(AudioManager.STREAM_MUSIC);
    Window window = getWindow();
    if (window != null) {
      WindowCompat.setDecorFitsSystemWindows(window, false);
      window.setStatusBarColor(Color.TRANSPARENT);
      window.setNavigationBarColor(Color.TRANSPARENT);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        WindowManager.LayoutParams lp = window.getAttributes();
        lp.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
          ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
          : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        window.setAttributes(lp);
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        window.setStatusBarContrastEnforced(false);
        window.setNavigationBarContrastEnforced(false);
      }
    }
  }
}
