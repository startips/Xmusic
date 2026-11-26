package cn.toside.music.mobile.view

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Outline
import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewOutlineProvider
import android.view.animation.DecelerateInterpolator
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.NativeGestureUtil
import com.facebook.react.views.view.ReactViewGroup
import kotlin.math.abs
import kotlin.math.max

/**
 * Full-screen container that detects inward edge swipes from either left or right bezel
 * (even over inner PagerView/FlatList children), renders an interactive collapse preview
 * on the UI thread, and notifies JS to run the bottom PlayerBar collapse pop transition.
 */
class EdgeSwipeView(context: Context) : ReactViewGroup(context) {
  companion object {
    private const val MIN_SCALE = 0.88f
    private const val FLING_MIN_DISTANCE_DP = 24f
    private const val FLING_MIN_VELOCITY_DP_PER_SEC = 280f
    private const val MAX_DRAG_DISTANCE_DP = 180f
    private const val MAX_TRANSLATE_Y_DP = 56f
    private const val MAX_TRANSLATE_X_DP = 16f
    private const val SLIDE_MAX_TRANSLATE_X_DP = 28f
    private const val DRAG_CORNER_RADIUS_DP = 32f
    private const val BOTTOM_CONTROLS_SAFE_DP = 136f
    private const val MODE_MINIMIZE = "minimize"
    private const val MODE_SLIDE = "slide"
  }

  private val touchSlop: Int = ViewConfiguration.get(context).scaledTouchSlop
  private val cornerRadiusPx: Float = PixelUtil.toPixelFromDIP(DRAG_CORNER_RADIUS_DP)
  private val maxDragDistancePx: Float = PixelUtil.toPixelFromDIP(MAX_DRAG_DISTANCE_DP)
  private val maxTranslateYPx: Float = PixelUtil.toPixelFromDIP(MAX_TRANSLATE_Y_DP)
  private val maxTranslateXPx: Float = PixelUtil.toPixelFromDIP(MAX_TRANSLATE_X_DP)
  private val slideMaxTranslateXPx: Float = PixelUtil.toPixelFromDIP(SLIDE_MAX_TRANSLATE_X_DP)
  private val flingMinDistancePx: Float = PixelUtil.toPixelFromDIP(FLING_MIN_DISTANCE_DP)
  private val flingMinVelocityPx: Float = PixelUtil.toPixelFromDIP(FLING_MIN_VELOCITY_DP_PER_SEC)
  private val bottomControlsSafePx: Float = PixelUtil.toPixelFromDIP(BOTTOM_CONTROLS_SAFE_DP)
  private val resetDismissLockRunnable = Runnable { dismissDispatched = false }

  private var edgeWidthPx: Float = PixelUtil.toPixelFromDIP(24f)
  private var dismissDistancePx: Float = PixelUtil.toPixelFromDIP(64f)
  private var mode: String = MODE_MINIMIZE
  private var swipeEnabled: Boolean = true

  private var activeSide: Int = 0 // -1 = left, 1 = right, 0 = none
  private var edgeCancelled: Boolean = false
  private var isDragging: Boolean = false
  private var dismissDispatched: Boolean = false
  private var thresholdTickTriggered: Boolean = false
  private var downRawX: Float = 0f
  private var downRawY: Float = 0f
  private var currentInwardDx: Float = 0f
  private var velocityTracker: VelocityTracker? = null

  init {
    outlineProvider = object : ViewOutlineProvider() {
      override fun getOutline(view: View, outline: Outline) {
        outline.setRoundRect(0, 0, view.width, view.height, cornerRadiusPx)
      }
    }
  }

  fun setEdgeWidth(edgeWidthDp: Float) {
    this.edgeWidthPx = PixelUtil.toPixelFromDIP(edgeWidthDp.coerceIn(12f, 32f))
  }

  fun setDismissDistance(dismissDistanceDp: Float) {
    this.dismissDistancePx = PixelUtil.toPixelFromDIP(max(24f, dismissDistanceDp))
  }

  fun setMode(mode: String?) {
    this.mode = if (MODE_SLIDE == mode) MODE_SLIDE else MODE_MINIMIZE
  }

  fun setSwipeEnabled(swipeEnabled: Boolean) {
    this.swipeEnabled = swipeEnabled
    if (!swipeEnabled && !isDragging) {
      cancelEdgeTracking()
    }
  }

  fun prepareMinimize() {
    pivotX = width * 0.5f
    pivotY = height * 0.5f
    clipToOutline = true
    invalidateOutline()
  }

  override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
    if (!swipeEnabled) {
      cancelEdgeTracking()
      return false
    }
    if (dismissDispatched) return false

    when (ev.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        activeSide = 0
        edgeCancelled = false
        isDragging = false
        thresholdTickTriggered = false
        currentInwardDx = 0f
        recycleVelocityTracker()

        val w = width
        val h = height
        val x = ev.x
        val y = ev.y
        if (MODE_SLIDE == mode) {
          if (w > 0 && h > 0 && x <= edgeWidthPx) {
            activeSide = -1
          }
        } else {
          if (w > 0 && h > 0 && y < max(h * 0.65f, h - bottomControlsSafePx)) {
            if (x <= edgeWidthPx) {
              activeSide = -1
            } else if (x >= w - edgeWidthPx) {
              activeSide = 1
            }
          }
        }
        downRawX = ev.rawX
        downRawY = ev.rawY
        return false
      }

      MotionEvent.ACTION_MOVE -> {
        if (isDragging) return true
        if (activeSide == 0 || edgeCancelled) return false

        val dx = ev.rawX - downRawX
        val dy = ev.rawY - downRawY
        val absDx = abs(dx)
        val absDy = abs(dy)
        val inwardDx = if (activeSide == -1) dx else -dx

        if (absDy > touchSlop && absDy >= absDx * 0.9f) {
          cancelEdgeTracking()
          return false
        }
        if (inwardDx < -touchSlop) {
          cancelEdgeTracking()
          return false
        }
        if (inwardDx > touchSlop && inwardDx > absDy * 1.25f) {
          startDragging(ev)
          return true
        }
        return false
      }

      MotionEvent.ACTION_POINTER_DOWN,
      MotionEvent.ACTION_UP,
      MotionEvent.ACTION_CANCEL -> {
        cancelEdgeTracking()
        return false
      }

      else -> return false
    }
  }

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(ev: MotionEvent): Boolean {
    if (dismissDispatched) return true
    if (!isDragging && activeSide == 0) {
      return super.onTouchEvent(ev)
    }

    val action = ev.actionMasked
    if (action == MotionEvent.ACTION_DOWN) {
      return activeSide != 0
    }

    val vt = velocityTracker ?: VelocityTracker.obtain().also { velocityTracker = it }
    val rawEvent = MotionEvent.obtain(ev)
    rawEvent.setLocation(ev.rawX, ev.rawY)
    vt.addMovement(rawEvent)
    rawEvent.recycle()

    when (action) {
      MotionEvent.ACTION_MOVE -> {
        if (activeSide == 0 || edgeCancelled) return false
        if (!isDragging) {
          val dx = ev.rawX - downRawX
          val dy = ev.rawY - downRawY
          val inwardDx = if (activeSide == -1) dx else -dx
          if (inwardDx > touchSlop && inwardDx > abs(dy) * 1.25f) {
            startDragging(ev)
          } else {
            return true
          }
        }
        val dx = ev.rawX - downRawX
        currentInwardDx = max(0f, if (activeSide == -1) dx else -dx)
        if (!thresholdTickTriggered && currentInwardDx >= dismissDistancePx) {
          thresholdTickTriggered = true
          triggerThresholdHaptic()
        } else if (thresholdTickTriggered && currentInwardDx < dismissDistancePx * 0.8f) {
          thresholdTickTriggered = false
        }
        applyDragTransform(currentInwardDx)
        return true
      }

      MotionEvent.ACTION_UP -> {
        var shouldDismiss = false
        if (isDragging && activeSide != 0 && !edgeCancelled) {
          vt.computeCurrentVelocity(1000)
          val rawVx = vt.xVelocity
          val inwardVx = if (activeSide == -1) rawVx else -rawVx
          shouldDismiss = currentInwardDx >= dismissDistancePx ||
            (inwardVx >= flingMinVelocityPx && currentInwardDx >= flingMinDistancePx)
        }
        if (shouldDismiss) {
          finishWithDismiss(ev)
        } else {
          resetDragAnimated(ev)
        }
        return true
      }

      MotionEvent.ACTION_CANCEL,
      MotionEvent.ACTION_POINTER_DOWN -> {
        resetDragAnimated(ev)
        return true
      }

      else -> return isDragging
    }
  }

  private fun triggerThresholdHaptic() {
    val constant = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      HapticFeedbackConstants.CLOCK_TICK
    } else {
      HapticFeedbackConstants.KEYBOARD_TAP
    }
    performHapticFeedback(constant)
  }

  private fun startDragging(ev: MotionEvent) {
    isDragging = true
    animate().cancel()
    pivotX = width * 0.5f
    pivotY = height * 0.5f
    clipToOutline = true
    invalidateOutline()
    parent?.requestDisallowInterceptTouchEvent(true)
    NativeGestureUtil.notifyNativeGestureStarted(this, ev)

    val vt = velocityTracker ?: VelocityTracker.obtain().also { velocityTracker = it }
    val rawEvent = MotionEvent.obtain(ev)
    rawEvent.setLocation(ev.rawX, ev.rawY)
    vt.addMovement(rawEvent)
    rawEvent.recycle()

    val dx = ev.rawX - downRawX
    currentInwardDx = max(0f, if (activeSide == -1) dx else -dx)
    applyDragTransform(currentInwardDx)
  }

  private fun applyDragTransform(inwardDx: Float) {
    val progress = (inwardDx / maxDragDistancePx).coerceIn(0f, 1f)
    if (MODE_SLIDE == mode) {
      val scale = 1f - 0.05f * progress
      scaleX = scale
      scaleY = scale
      translationX = slideMaxTranslateXPx * progress
      translationY = 0f
      return
    }
    val scale = 1f - (1f - MIN_SCALE) * progress
    val txDirection = if (activeSide == -1) 1f else -1f
    scaleX = scale
    scaleY = scale
    translationY = maxTranslateYPx * progress
    translationX = txDirection * maxTranslateXPx * progress
  }

  private fun finishWithDismiss(ev: MotionEvent) {
    dismissDispatched = true
    isDragging = false
    activeSide = 0
    recycleVelocityTracker()
    NativeGestureUtil.notifyNativeGestureEnded(this, ev)
    clipToOutline = true
    removeCallbacks(resetDismissLockRunnable)
    postDelayed(resetDismissLockRunnable, 600L)
    dispatchEdgeDismissEvent()
  }

  private fun resetDragAnimated(ev: MotionEvent) {
    val wasDragging = isDragging
    isDragging = false
    activeSide = 0
    edgeCancelled = false
    thresholdTickTriggered = false
    currentInwardDx = 0f
    recycleVelocityTracker()
    if (wasDragging) {
      NativeGestureUtil.notifyNativeGestureEnded(this, ev)
      animate()
        .scaleX(1f)
        .scaleY(1f)
        .translationX(0f)
        .translationY(0f)
        .setDuration(220L)
        .setInterpolator(DecelerateInterpolator())
        .withEndAction { clipToOutline = false }
        .start()
    }
  }

  private fun cancelEdgeTracking() {
    activeSide = 0
    edgeCancelled = true
    isDragging = false
    recycleVelocityTracker()
  }

  private fun recycleVelocityTracker() {
    velocityTracker?.recycle()
    velocityTracker = null
  }

  private fun dispatchEdgeDismissEvent() {
    val reactContext = context as? ReactContext ?: return
    val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
    dispatcher?.dispatchEvent(EdgeDismissEvent(surfaceId, id))
  }

  override fun onDetachedFromWindow() {
    removeCallbacks(resetDismissLockRunnable)
    recycleVelocityTracker()
    super.onDetachedFromWindow()
  }

  private class EdgeDismissEvent(surfaceId: Int, viewTag: Int) : Event<EdgeDismissEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = EdgeSwipeViewManager.EVENT_EDGE_DISMISS

    override fun getEventData(): WritableMap = Arguments.createMap()
  }
}
