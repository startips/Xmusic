package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Outline;
import android.view.MotionEvent;
import android.view.VelocityTracker;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewOutlineProvider;
import android.view.animation.DecelerateInterpolator;

import androidx.annotation.NonNull;

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
  private static final float MIN_SCALE = 0.86f;
  private static final float FLING_MIN_DISTANCE_DP = 24f;
  private static final float FLING_MIN_VELOCITY_DP_PER_SEC = 280f;
  private static final float MAX_DRAG_DISTANCE_DP = 180f;
  private static final float MAX_TRANSLATE_Y_DP = 64f;
  private static final float MAX_TRANSLATE_X_DP = 18f;
  private static final float DRAG_CORNER_RADIUS_DP = 32f;

  private final int touchSlop;
  private final float cornerRadiusPx;
  private final float maxDragDistancePx;
  private final float maxTranslateYPx;
  private final float maxTranslateXPx;
  private final float flingMinDistancePx;
  private final float flingMinVelocityPx;

  private float edgeWidthPx = PixelUtil.toPixelFromDIP(42f);
  private float dismissDistancePx = PixelUtil.toPixelFromDIP(64f);

  private int activeSide = 0; // -1 = left, 1 = right, 0 = none
  private boolean edgeCancelled = false;
  private boolean isDragging = false;
  private boolean dismissDispatched = false;
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
    flingMinDistancePx = PixelUtil.toPixelFromDIP(FLING_MIN_DISTANCE_DP);
    flingMinVelocityPx = PixelUtil.toPixelFromDIP(FLING_MIN_VELOCITY_DP_PER_SEC);

    setOutlineProvider(new ViewOutlineProvider() {
      @Override
      public void getOutline(View view, Outline outline) {
        outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), cornerRadiusPx);
      }
    });
  }

  public void setEdgeWidth(float edgeWidthDp) {
    this.edgeWidthPx = PixelUtil.toPixelFromDIP(Math.max(12f, edgeWidthDp));
  }

  public void setDismissDistance(float dismissDistanceDp) {
    this.dismissDistancePx = PixelUtil.toPixelFromDIP(Math.max(24f, dismissDistanceDp));
  }

  public void prepareMinimize() {
    setPivotX(getWidth() * 0.5f);
    setPivotY(getHeight() * 0.5f);
    setClipToOutline(true);
    invalidateOutline();
  }

  @Override
  public void requestDisallowInterceptTouchEvent(boolean disallowIntercept) {
    // Keep intercept control until an edge gesture either locks in or resolves as child scroll.
    if (disallowIntercept && activeSide != 0 && !edgeCancelled && !isDragging) {
      return;
    }
    super.requestDisallowInterceptTouchEvent(disallowIntercept);
  }

  @Override
  public boolean onInterceptTouchEvent(MotionEvent ev) {
    if (dismissDispatched) return false;

    switch (ev.getActionMasked()) {
      case MotionEvent.ACTION_DOWN: {
        activeSide = 0;
        edgeCancelled = false;
        isDragging = false;
        currentInwardDx = 0f;
        recycleVelocityTracker();

        int width = getWidth();
        float x = ev.getX();
        if (width > 0) {
          if (x <= edgeWidthPx) {
            activeSide = -1;
          } else if (x >= width - edgeWidthPx) {
            activeSide = 1;
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
        if (inwardDx > touchSlop && inwardDx > absDy * 1.2f) {
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

    if (velocityTracker == null) {
      velocityTracker = VelocityTracker.obtain();
    }
    MotionEvent rawEvent = MotionEvent.obtain(ev);
    rawEvent.setLocation(ev.getRawX(), ev.getRawY());
    velocityTracker.addMovement(rawEvent);
    rawEvent.recycle();

    switch (ev.getActionMasked()) {
      case MotionEvent.ACTION_MOVE: {
        if (activeSide == 0 || edgeCancelled) return false;
        float dx = ev.getRawX() - downRawX;
        currentInwardDx = Math.max(0f, activeSide == -1 ? dx : -dx);
        applyDragTransform(currentInwardDx);
        return true;
      }

      case MotionEvent.ACTION_UP: {
        boolean shouldDismiss = false;
        if (activeSide != 0 && !edgeCancelled) {
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

    velocityTracker = VelocityTracker.obtain();
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
    animate()
      .translationX(0f)
      .translationY(0f)
      .setDuration(180)
      .setInterpolator(new DecelerateInterpolator())
      .start();
    dispatchEdgeDismissEvent();
  }

  private void resetDragAnimated(MotionEvent ev) {
    boolean wasDragging = isDragging;
    isDragging = false;
    activeSide = 0;
    edgeCancelled = false;
    currentInwardDx = 0f;
    recycleVelocityTracker();
    if (wasDragging) {
      NativeGestureUtil.notifyNativeGestureEnded(this, ev);
    }
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
