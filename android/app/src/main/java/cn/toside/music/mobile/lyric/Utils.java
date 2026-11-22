package cn.toside.music.mobile.lyric;

import android.os.Handler;
import android.os.Looper;

public class Utils {
  public static Object setTimeout(Runnable runnable, long delay) {
    return new TimeoutEvent(runnable, delay);
  }

  public static void clearTimeout(Object timeoutEvent) {
    if (timeoutEvent instanceof TimeoutEvent) {
      ((TimeoutEvent) timeoutEvent).cancelTimeout();
    }
  }

  private static class TimeoutEvent {
    private static final Handler handler = new Handler(Looper.getMainLooper());
    private volatile Runnable runnable;
    private final Runnable wrapper;

    private TimeoutEvent(Runnable task, long delay) {
      runnable = task;
      wrapper = () -> {
        Runnable r = runnable;
        if (r != null) {
          r.run();
        }
      };
      handler.postDelayed(wrapper, Math.max(0L, delay));
    }

    private void cancelTimeout() {
      runnable = null;
      handler.removeCallbacks(wrapper);
    }
  }
}
