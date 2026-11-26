package cn.toside.music.mobile.view

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.os.SystemClock
import android.view.ViewGroup
import com.facebook.drawee.controller.AbstractDraweeControllerBuilder
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.image.GlobalImageLoadListener
import com.facebook.react.views.image.ReactImageView
import com.reactnativenavigation.viewcontrollers.viewcontroller.overlay.OverlayLayout
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * ReactImageView subclass that applies top/bottom DST_IN alpha edge fades directly
 * on the image surface so shared-element transitions smoothly melt edges in lockstep
 * with the flight animation rather than snapping onto the image after arrival.
 */
class FadeImageView(
  context: Context,
  draweeControllerBuilder: AbstractDraweeControllerBuilder<*, *, *, *>,
  globalImageLoadListener: GlobalImageLoadListener?,
  callerContext: Any?,
) : ReactImageView(context, draweeControllerBuilder, globalImageLoadListener, callerContext) {

  companion object {
    private const val TRANSITION_WINDOW_MS = 650L

    private fun lerpAlphaColor(targetAlpha: Int, progress: Float): Int {
      val alpha = (255f + (targetAlpha - 255f) * progress).roundToInt().coerceIn(0, 255)
      return (alpha shl 24) or 0x00FFFFFF
    }
  }

  private val maskPaint = Paint(Paint.DITHER_FLAG).apply {
    xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
  }
  private val clipPath = Path()
  private val clipRectF = RectF()
  private val clipBoundsRect = Rect()
  private val posScratch = FloatArray(24)
  private val colorScratch = IntArray(24)

  private var topFadeStart = 0.04f
  private var topFadeEnd = 0.22f
  private var fadeStart = 0.54f
  private var fadeEnd = 0.98f
  private var startCornerRadiusPx: Float = PixelUtil.toPixelFromDIP(12f)

  private var attachTimeMs = 0L
  private var hasAnimatedClip = false
  private var transitionComplete = false
  private var initialClipWidth = 0
  private var initialClipHeight = 0

  private var cachedTop = Int.MIN_VALUE
  private var cachedHeight = -1
  private var cachedTopStart = -1f
  private var cachedTopEnd = -1f
  private var cachedStart = -1f
  private var cachedEnd = -1f
  private var cachedProgressStep = -1

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    attachTimeMs = SystemClock.uptimeMillis()
    hasAnimatedClip = false
    transitionComplete = false
    initialClipWidth = 0
    initialClipHeight = 0
  }

  override fun layout(l: Int, t: Int, r: Int, b: Int) {
    val p = parent
    val lp = layoutParams
    if (p is OverlayLayout && lp is ViewGroup.MarginLayoutParams) {
      val expectedL = lp.leftMargin
      val expectedT = lp.topMargin
      val w = r - l
      val h = b - t
      if (w > 0 && h > 0 && (l != expectedL || t != expectedT)) {
        super.layout(expectedL, expectedT, expectedL + w, expectedT + h)
        return
      }
    }
    super.layout(l, t, r, b)
  }

  fun setTopFadeStart(start: Float) {
    val clamped = start.coerceIn(0f, 0.45f)
    if (topFadeStart != clamped) {
      topFadeStart = clamped
      invalidate()
    }
  }

  fun setTopFadeEnd(end: Float) {
    val clamped = end.coerceIn(0f, 0.49f)
    if (topFadeEnd != clamped) {
      topFadeEnd = clamped
      invalidate()
    }
  }

  fun setFadeStart(start: Float) {
    val clamped = start.coerceIn(0f, 0.98f)
    if (fadeStart != clamped) {
      fadeStart = clamped
      invalidate()
    }
  }

  fun setFadeEnd(end: Float) {
    val clamped = end.coerceIn(0.02f, 1f)
    if (fadeEnd != clamped) {
      fadeEnd = clamped
      invalidate()
    }
  }

  fun setStartCornerRadius(radiusDp: Float) {
    val radiusPx = PixelUtil.toPixelFromDIP(max(0f, radiusDp))
    if (startCornerRadiusPx != radiusPx) {
      startCornerRadiusPx = radiusPx
      invalidate()
    }
  }

  override fun hasOverlappingRendering(): Boolean = true

  private fun ensureShader(top: Int, height: Int, progress: Float) {
    val tStart = topFadeStart.coerceIn(0f, 0.45f)
    val tEnd = topFadeEnd.coerceIn(tStart, 0.49f)
    val bStart = fadeStart.coerceIn(tEnd, 0.98f)
    val bEnd = fadeEnd.coerceIn(bStart, 1f)
    val progressStep = (progress * 100f).roundToInt()

    if (cachedTop == top &&
      cachedHeight == height &&
      cachedTopStart == tStart &&
      cachedTopEnd == tEnd &&
      cachedStart == bStart &&
      cachedEnd == bEnd &&
      cachedProgressStep == progressStep
    ) {
      return
    }

    cachedTop = top
    cachedHeight = height
    cachedTopStart = tStart
    cachedTopEnd = tEnd
    cachedStart = bStart
    cachedEnd = bEnd
    cachedProgressStep = progressStep

    val hasTop = (tEnd - tStart) > 0.005f
    val hasBottom = (bEnd - bStart) > 0.005f

    var count = 0
    if (hasTop) {
      posScratch[count] = 0f
      colorScratch[count++] = lerpAlphaColor(0x00, progress)
      if (tStart > 0.002f) {
        posScratch[count] = tStart
        colorScratch[count++] = lerpAlphaColor(0x00, progress)
      }
      val tSpan = tEnd - tStart
      posScratch[count] = tStart + tSpan * 0.12f
      colorScratch[count++] = lerpAlphaColor(0x06, progress)
      posScratch[count] = tStart + tSpan * 0.24f
      colorScratch[count++] = lerpAlphaColor(0x18, progress)
      posScratch[count] = tStart + tSpan * 0.38f
      colorScratch[count++] = lerpAlphaColor(0x3E, progress)
      posScratch[count] = tStart + tSpan * 0.52f
      colorScratch[count++] = lerpAlphaColor(0x76, progress)
      posScratch[count] = tStart + tSpan * 0.67f
      colorScratch[count++] = lerpAlphaColor(0xB4, progress)
      posScratch[count] = tStart + tSpan * 0.83f
      colorScratch[count++] = lerpAlphaColor(0xE6, progress)
      posScratch[count] = tEnd
      colorScratch[count++] = 0xFFFFFFFF.toInt()
    } else {
      posScratch[count] = 0f
      colorScratch[count++] = 0xFFFFFFFF.toInt()
    }

    if (hasBottom) {
      val bSpan = bEnd - bStart
      if (bStart > posScratch[count - 1] + 0.001f) {
        posScratch[count] = bStart
        colorScratch[count++] = 0xFFFFFFFF.toInt()
      }
      posScratch[count] = bStart + bSpan * 0.17f
      colorScratch[count++] = lerpAlphaColor(0xE6, progress)
      posScratch[count] = bStart + bSpan * 0.33f
      colorScratch[count++] = lerpAlphaColor(0xB4, progress)
      posScratch[count] = bStart + bSpan * 0.48f
      colorScratch[count++] = lerpAlphaColor(0x76, progress)
      posScratch[count] = bStart + bSpan * 0.62f
      colorScratch[count++] = lerpAlphaColor(0x3E, progress)
      posScratch[count] = bStart + bSpan * 0.76f
      colorScratch[count++] = lerpAlphaColor(0x18, progress)
      posScratch[count] = bStart + bSpan * 0.88f
      colorScratch[count++] = lerpAlphaColor(0x06, progress)
      posScratch[count] = bEnd
      colorScratch[count++] = lerpAlphaColor(0x00, progress)
      if (bEnd < 0.999f) {
        posScratch[count] = 1f
        colorScratch[count++] = lerpAlphaColor(0x00, progress)
      }
    } else {
      posScratch[count] = 1f
      colorScratch[count++] = 0xFFFFFFFF.toInt()
    }

    val positions = FloatArray(count)
    val colors = IntArray(count)
    System.arraycopy(posScratch, 0, positions, 0, count)
    System.arraycopy(colorScratch, 0, colors, 0, count)

    var gradTop = if (hasTop && height > 6) top + 2f else top.toFloat()
    var gradBottom = if (hasBottom && height > 6) top + height - 2f else (top + height).toFloat()
    if (gradBottom <= gradTop + 1f) {
      gradTop = top.toFloat()
      gradBottom = (top + height).toFloat()
    }
    maskPaint.shader = LinearGradient(0f, gradTop, 0f, gradBottom, colors, positions, Shader.TileMode.CLAMP)
  }

  override fun onDraw(canvas: Canvas) {
    val viewW = width
    val viewH = height
    if (viewW <= 0 || viewH <= 0) {
      super.onDraw(canvas)
      return
    }

    val hasClip = getClipBounds(clipBoundsRect)
    val drawLeft = if (hasClip) max(0, clipBoundsRect.left) else 0
    val drawTop = if (hasClip) max(0, clipBoundsRect.top) else 0
    val drawRight = if (hasClip) min(viewW, clipBoundsRect.right) else viewW
    val drawBottom = if (hasClip) min(viewH, clipBoundsRect.bottom) else viewH
    val drawW = drawRight - drawLeft
    val drawH = drawBottom - drawTop
    if (drawW <= 0 || drawH <= 0) {
      super.onDraw(canvas)
      return
    }

    val withinTransitionWindow = (SystemClock.uptimeMillis() - attachTimeMs) <= TRANSITION_WINDOW_MS
    var transitionProgress = 1f
    var cornerProgress = 1f
    if (!transitionComplete && withinTransitionWindow) {
      if (hasClip && (drawW < viewW - 2 || drawH < viewH - 2)) {
        if (!hasAnimatedClip) {
          hasAnimatedClip = true
          initialClipWidth = drawW
          initialClipHeight = drawH
        }
        val denomW = max(1, viewW - initialClipWidth)
        val denomH = max(1, viewH - initialClipHeight)
        val progW = (drawW - initialClipWidth) / denomW.toFloat()
        val progH = (drawH - initialClipHeight) / denomH.toFloat()
        val rawProgress = min(progW, progH).coerceIn(0f, 1f)
        cornerProgress = rawProgress * rawProgress
        transitionProgress = 1f - (1f - rawProgress) * (1f - rawProgress)
      } else if (hasAnimatedClip) {
        transitionComplete = true
      }
    } else {
      transitionComplete = true
    }

    val hasTop = (topFadeEnd - topFadeStart) > 0.005f
    val hasBottom = (fadeEnd - fadeStart) > 0.005f
    val cornerRadiusPx = startCornerRadiusPx * (1f - cornerProgress)
    val isFlightClip = !transitionComplete && hasClip && drawW > 4 && drawH > 4
    val inset = if (isFlightClip) 1f else 0f
    val contentLeft = drawLeft + inset
    val contentTop = drawTop + inset
    val contentRight = drawRight - inset
    val contentBottom = drawBottom - inset

    if ((!hasTop && !hasBottom) || transitionProgress <= 0.001f) {
      if (cornerRadiusPx > 0.5f || isFlightClip) {
        val save = canvas.save()
        if (cornerRadiusPx > 0.5f) {
          clipPath.reset()
          clipRectF.set(contentLeft, contentTop, contentRight, contentBottom)
          clipPath.addRoundRect(clipRectF, cornerRadiusPx, cornerRadiusPx, Path.Direction.CW)
          canvas.clipPath(clipPath)
        } else {
          canvas.clipRect(contentLeft, contentTop, contentRight, contentBottom)
        }
        super.onDraw(canvas)
        canvas.restoreToCount(save)
      } else {
        super.onDraw(canvas)
      }
      return
    }

    val shaderTop = if (transitionComplete) 0 else contentTop.roundToInt()
    val shaderHeight = if (transitionComplete) viewH else max(1, (contentBottom - contentTop).roundToInt())
    val layerLeft = if (transitionComplete) 0 else drawLeft
    val layerTop = if (transitionComplete) 0 else drawTop
    val layerRight = if (transitionComplete) viewW else drawRight
    val layerBottom = if (transitionComplete) viewH else drawBottom

    val saveCount = canvas.saveLayer(
      layerLeft - 4f,
      layerTop - 4f,
      layerRight + 4f,
      layerBottom + 4f,
      null,
    )
    if (cornerRadiusPx > 0.5f || isFlightClip) {
      val clipSave = canvas.save()
      if (cornerRadiusPx > 0.5f) {
        clipPath.reset()
        clipRectF.set(contentLeft, contentTop, contentRight, contentBottom)
        clipPath.addRoundRect(clipRectF, cornerRadiusPx, cornerRadiusPx, Path.Direction.CW)
        canvas.clipPath(clipPath)
      } else {
        canvas.clipRect(contentLeft, contentTop, contentRight, contentBottom)
      }
      super.onDraw(canvas)
      canvas.restoreToCount(clipSave)
    } else {
      super.onDraw(canvas)
    }
    ensureShader(shaderTop, shaderHeight, transitionProgress)
    canvas.drawRect(layerLeft - 4f, layerTop - 4f, layerRight + 4f, layerBottom + 4f, maskPaint)
    canvas.restoreToCount(saveCount)
  }
}
