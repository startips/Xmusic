package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Outline;
import android.os.Build;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.VelocityTracker;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewOutlineProvider;
import android.view.animation.DecelerateInterpolator;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.events.Event;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.uimanager.events.NativeGestureUtil;
import com.facebook.react.views.view.ReactViewGroup;

/**
 * Full-screen container that detects inward edge swipes from either left or right bezel
 * (even over inner PagerView/FlatList children), renders an interactive collapse preview
 * on the UI thread, and notifies JS to run the bottom PlayerBar collapse pop transition.
 */
public class EdgeSwipeView extends ReactViewGroup {
  private static final float MIN_SCALE = 0.88f;
  private static final float FLING_MIN_DISTANCE_DP = 24f;
  private static final float FLING_MIN_VELOCITY_DP_PER_SEC = 280f;
  private static final float MAX_DRAG_DISTANCE_DP = 180f;
  private static final float MAX_TRANSLATE_Y_DP = 56f;
  private static final float MAX_TRANSLATE_X_DP = 16f;
  private static final float SLIDE_MAX_TRANSLATE_X_DP = 28f;
  private static final float DRAG_CORNER_RADIUS_DP = 32f;
  private static final float BOTTOM_CONTROLS_SAFE_DP = 136f;
  private static final String MODE_MINIMIZE = "minimize";
  private static final String MODE_SLIDE = "slide";

  private final int touchSlop;
  private final float cornerRadiusPx;
  private final float maxDragDistancePx;
  private final float maxTranslateYPx;
  private final float maxTranslateXPx;
  private final float slideMaxTranslateXPx;
  private final float flingMinDistancePx;
  private final float flingMinVelocityPx;
  private final float bottomControlsSafePx;
  private final Runnable resetDismissLockRunnable = () -> dismissDispatched = false;

  private float edgeWidthPx = PixelUtil.toPixelFromDIP(24f);
  private float dismissDistancePx = PixelUtil.toPixelFromDIP(64f);
  private String mode = MODE_MINIMIZE;
  private boolean swipeEnabled = true;

  private int activeSide = 0; // -1 = left, 1 = right, 0 = none
  private boolean edgeCancelled = false;
  private boolean isDragging = false;
  private boolean dismissDispatched = false;
  private boolean thresholdTickTriggered = false;
  private float downRawX = 0f;
  private float downRawY = 0f;
  private float currentInwardDx = 0f;
  private VelocityTracker velocityTracker = null;

  public EdgeSwipeView(Context context) {
    super(context);
    touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
    cornerRadiusPx = PixelUtil.toPixelFromDIP(DRAG_CORNER_RADIUS_DP);
    maxDragDistancePx = PixelUtil.toPixelFromDIP(MAX_DRAG_DISTANCE_DP);
    maxTranslateYPx = PixelUtil.toPixelFromDIP(MAX_TRANSLATE_Y_DP);
    maxTranslateXPx = PixelUtil.toPixelFromDIP(MAX_TRANSLATE_X_DP);
    slideMaxTranslateXPx = PixelUtil.toPixelFromDIP(SLIDE_MAX_TRANSLATE_X_DP);
    flingMinDistancePx = PixelUtil.toPixelFromDIP(FLING_MIN_DISTANCE_DP);
    flingMinVelocityPx = PixelUtil.toPixelFromDIP(FLING_MIN_VELOCITY_DP_PER_SEC);
    bottomControlsSafePx = PixelUtil.toPixelFromDIP(BOTTOM_CONTROLS_SAFE_DP);

    setOutlineProvider(new ViewOutlineProvider() {
      @Override
      public void getOutline(View view, Outline outline) {
        outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), cornerRadiusPx);
      }
    });
  }

  public void setEdgeWidth(float edgeWidthDp) {
    this.edgeWidthPx = PixelUtil.toPixelFromDIP(Math.max(12f, Math.min(32f, edgeWidthDp)));
  }

  public void setDismissDistance(float dismissDistanceDp) {
    this.dismissDistancePx = PixelUtil.toPixelFromDIP(Math.max(24f, dismissDistanceDp));
  }

  public void setMode(String mode) {
    this.mode = MODE_SLIDE.equals(mode) ? MODE_SLIDE : MODE_MINIMIZE;
  }

  public void setSwipeEnabled(boolean swipeEnabled) {
    this.swipeEnabled = swipeEnabled;
    if (!swipeEnabled && !isDragging) {
      cancelEdgeTracking();
    }
  }

  public void prepareMinimize() {
    setPivotX(getWidth() * 0.5f);
    setPivotY(getHeight() * 0.5f);
    setClipToOutline(true);
    invalidateOutline();
  }

  @Override
  public boolean onInterceptTouchEvent(MotionEvent ev) {
    if (!swipeEnabled) {
      cancelEdgeTracking();
      return false;
    }
    if (dismissDispatched) return false;

    switch (ev.getActionMasked()) {
      case MotionEvent.ACTION_DOWN: {
        activeSide = 0;
        edgeCancelled = false;
        isDragging = false;
        thresholdTickTriggered = false;
        currentInwardDx = 0f;
        recycleVelocityTracker();

        int width = getWidth();
        int height = getHeight();
        float x = ev.getX();
        float y = ev.getY();
        if (MODE_SLIDE.equals(mode)) {
          if (width > 0 && height > 0 && x <= edgeWidthPx) {
            activeSide = -1;
          }
        } else {
          // Exclude the bottom player seekbar / transport region so scrubbing near 0:00 or track end never triggers dismiss
          if (width > 0 && height > 0 && y < Math.max(height * 0.65f, height - bottomControlsSafePx)) {
            if (x <= edgeWidthPx) {
              activeSide = -1;
            } else if (x >= width - edgeWidthPx) {
              activeSide = 1;
            }
          }
        }
        downRawX = ev.getRawX();
        downRawY = ev.getRawY();
        return false;
      }

      case MotionEvent.ACTION_MOVE: {
        if (isDragging) return true;
        if (activeSide == 0 || edgeCancelled) return false;

        float dx = ev.getRawX() - downRawX;
        float dy = ev.getRawY() - downRawY;
        float absDx = Math.abs(dx);
        float absDy = Math.abs(dy);
        float inwardDx = activeSide == -1 ? dx : -dx;

        if (absDy > touchSlop && absDy >= absDx * 0.9f) {
          cancelEdgeTracking();
          return false;
        }
        if (inwardDx < -touchSlop) {
          cancelEdgeTracking();
          return false;
        }
        if (inwardDx > touchSlop && inwardDx > absDy * 1.25f) {
          startDragging(ev);
          return true;
        }
        return false;
      }

      case MotionEvent.ACTION_POINTER_DOWN:
      case MotionEvent.ACTION_UP:
      case MotionEvent.ACTION_CANCEL:
        cancelEdgeTracking();
        return false;

      default:
        return false;
    }
  }

  @Override
  public boolean onTouchEvent(MotionEvent ev) {
    if (dismissDispatched) return true;
    if (!isDragging && activeSide == 0) {
      return super.onTouchEvent(ev);
    }

    int action = ev.getActionMasked();
    if (action == MotionEvent.ACTION_DOWN) {
      return activeSide != 0;
    }

    if (velocityTracker == null) {
      velocityTracker = VelocityTracker.obtain();
    }
    MotionEvent rawEvent = MotionEvent.obtain(ev);
    rawEvent.setLocation(ev.getRawX(), ev.getRawY());
    velocityTracker.addMovement(rawEvent);
    rawEvent.recycle();

    switch (action) {
      case MotionEvent.ACTION_MOVE: {
        if (activeSide == 0 || edgeCancelled) return false;
        if (!isDragging) {
          float dx = ev.getRawX() - downRawX;
          float dy = ev.getRawY() - downRawY;
          float inwardDx = activeSide == -1 ? dx : -dx;
          if (inwardDx > touchSlop && inwardDx > Math.abs(dy) * 1.25f) {
            startDragging(ev);
          } else {
            return true;
          }
        }
        float dx = ev.getRawX() - downRawX;
        currentInwardDx = Math.max(0f, activeSide == -1 ? dx : -dx);
        if (!thresholdTickTriggered && currentInwardDx >= dismissDistancePx) {
          thresholdTickTriggered = true;
          triggerThresholdHaptic();
        } else if (thresholdTickTriggered && currentInwardDx < dismissDistancePx * 0.8f) {
          thresholdTickTriggered = false;
        }
        applyDragTransform(currentInwardDx);
        return true;
      }

      case MotionEvent.ACTION_UP: {
        boolean shouldDismiss = false;
        if (isDragging && activeSide != 0 && !edgeCancelled) {
          velocityTracker.computeCurrentVelocity(1000);
          float rawVx = velocityTracker.getXVelocity();
          float inwardVx = activeSide == -1 ? rawVx : -rawVx;
          shouldDismiss = currentInwardDx >= dismissDistancePx
            || (inwardVx >= flingMinVelocityPx && currentInwardDx >= flingMinDistancePx);
        }
        if (shouldDismiss) {
          finishWithDismiss(ev);
        } else {
          resetDragAnimated(ev);
        }
        return true;
      }

      case MotionEvent.ACTION_CANCEL:
      case MotionEvent.ACTION_POINTER_DOWN:
        resetDragAnimated(ev);
        return true;

      default:
        return isDragging;
    }
  }

  private void triggerThresholdHaptic() {
    int constant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
      ? HapticFeedbackConstants.CLOCK_TICK
      : HapticFeedbackConstants.KEYBOARD_TAP;
    performHapticFeedback(constant);
  }

  private void startDragging(MotionEvent ev) {
    isDragging = true;
    animate().cancel();
    setPivotX(getWidth() * 0.5f);
    setPivotY(getHeight() * 0.5f);
    setClipToOutline(true);
    invalidateOutline();
    if (getParent() != null) {
      getParent().requestDisallowInterceptTouchEvent(true);
    }
    NativeGestureUtil.notifyNativeGestureStarted(this, ev);

    if (velocityTracker == null) {
      velocityTracker = VelocityTracker.obtain();
    }
    MotionEvent rawEvent = MotionEvent.obtain(ev);
    rawEvent.setLocation(ev.getRawX(), ev.getRawY());
    velocityTracker.addMovement(rawEvent);
    rawEvent.recycle();

    float dx = ev.getRawX() - downRawX;
    currentInwardDx = Math.max(0f, activeSide == -1 ? dx : -dx);
    applyDragTransform(currentInwardDx);
  }

  private void applyDragTransform(float inwardDx) {
    float progress = Math.max(0f, Math.min(1f, inwardDx / maxDragDistancePx));
    if (MODE_SLIDE.equals(mode)) {
      float scale = 1f - 0.05f * progress;
      setScaleX(scale);
      setScaleY(scale);
      setTranslationX(slideMaxTranslateXPx * progress);
      setTranslationY(0f);
      return;
    }
    float scale = 1f - (1f - MIN_SCALE) * progress;
    float txDirection = activeSide == -1 ? 1f : -1f;
    setScaleX(scale);
    setScaleY(scale);
    setTranslationY(maxTranslateYPx * progress);
    setTranslationX(txDirection * maxTranslateXPx * progress);
  }

  private void finishWithDismiss(MotionEvent ev) {
    dismissDispatched = true;
    isDragging = false;
    activeSide = 0;
    recycleVelocityTracker();
    NativeGestureUtil.notifyNativeGestureEnded(this, ev);
    setClipToOutline(true);
    removeCallbacks(resetDismissLockRunnable);
    postDelayed(resetDismissLockRunnable, 600);
    dispatchEdgeDismissEvent();
  }

  private void resetDragAnimated(MotionEvent ev) {
    boolean wasDragging = isDragging;
    isDragging = false;
    activeSide = 0;
    edgeCancelled = false;
    thresholdTickTriggered = false;
    currentInwardDx = 0f;
    recycleVelocityTracker();
    if (wasDragging) {
      NativeGestureUtil.notifyNativeGestureEnded(this, ev);
      animate()
        .scaleX(1f)
        .scaleY(1f)
        .translationX(0f)
        .translationY(0f)
        .setDuration(220)
        .setInterpolator(new DecelerateInterpolator())
        .withEndAction(() -> setClipToOutline(false))
        .start();
    }
  }

  private void cancelEdgeTracking() {
    activeSide = 0;
    edgeCancelled = true;
    isDragging = false;
    recycleVelocityTracker();
  }

  private void recycleVelocityTracker() {
    if (velocityTracker != null) {
      velocityTracker.recycle();
      velocityTracker = null;
    }
  }

  private void dispatchEdgeDismissEvent() {
    if (!(getContext() instanceof ReactContext)) return;
    ReactContext reactContext = (ReactContext) getContext();
    int surfaceId = UIManagerHelper.getSurfaceId(reactContext);
    EventDispatcher dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, getId());
    if (dispatcher != null) {
      dispatcher.dispatchEvent(new EdgeDismissEvent(surfaceId, getId()));
    }
  }

  @Override
  protected void onDetachedFromWindow() {
    removeCallbacks(resetDismissLockRunnable);
    recycleVelocityTracker();
    super.onDetachedFromWindow();
  }

  private static class EdgeDismissEvent extends Event<EdgeDismissEvent> {
    EdgeDismissEvent(int surfaceId, int viewTag) {
      super(surfaceId, viewTag);
    }

    @Override
    public String getEventName() {
      return EdgeSwipeViewManager.EVENT_EDGE_DISMISS;
    }

    @Override
    protected WritableMap getEventData() {
      return Arguments.createMap();
    }
  }
}
