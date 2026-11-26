package cn.toside.music.mobile.view

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Shader
import com.facebook.react.views.view.ReactViewGroup

/**
 * Container view that smoothly fades its children's top and bottom edges to transparent
 * using a multi-stop PorterDuff DST_IN alpha gradient.
 */
class AlphaFadeView(context: Context) : ReactViewGroup(context) {
  private val maskPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG).apply {
    xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
  }
  private val posScratch = FloatArray(24)
  private val colorScratch = IntArray(24)

  private var topFadeStart = 0.0f
  private var topFadeEnd = 0.0f
  private var fadeStart = 0.60f
  private var fadeEnd = 1.0f

  private var cachedHeight = -1
  private var cachedTopStart = -1f
  private var cachedTopEnd = -1f
  private var cachedStart = -1f
  private var cachedEnd = -1f

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

  private fun ensureShader(height: Int) {
    val tStart = topFadeStart.coerceIn(0f, 0.45f)
    val tEnd = topFadeEnd.coerceIn(tStart, 0.49f)
    val bStart = fadeStart.coerceIn(tEnd, 0.98f)
    val bEnd = fadeEnd.coerceIn(bStart, 1f)

    if (cachedHeight == height &&
      cachedTopStart == tStart &&
      cachedTopEnd == tEnd &&
      cachedStart == bStart &&
      cachedEnd == bEnd
    ) {
      return
    }

    cachedHeight = height
    cachedTopStart = tStart
    cachedTopEnd = tEnd
    cachedStart = bStart
    cachedEnd = bEnd

    val hasTop = (tEnd - tStart) > 0.005f
    val hasBottom = (bEnd - bStart) > 0.005f

    var count = 0
    if (hasTop) {
      posScratch[count] = 0f
      colorScratch[count++] = 0x00FFFFFF
      if (tStart > 0.002f) {
        posScratch[count] = tStart
        colorScratch[count++] = 0x00FFFFFF
      }
      val tSpan = tEnd - tStart
      posScratch[count] = tStart + tSpan * 0.12f
      colorScratch[count++] = 0x06FFFFFF
      posScratch[count] = tStart + tSpan * 0.24f
      colorScratch[count++] = 0x18FFFFFF
      posScratch[count] = tStart + tSpan * 0.38f
      colorScratch[count++] = 0x3EFFFFFF
      posScratch[count] = tStart + tSpan * 0.52f
      colorScratch[count++] = 0x76FFFFFF
      posScratch[count] = tStart + tSpan * 0.67f
      colorScratch[count++] = 0xB4FFFFFF.toInt()
      posScratch[count] = tStart + tSpan * 0.83f
      colorScratch[count++] = 0xE6FFFFFF.toInt()
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
      colorScratch[count++] = 0xE6FFFFFF.toInt()
      posScratch[count] = bStart + bSpan * 0.33f
      colorScratch[count++] = 0xB4FFFFFF.toInt()
      posScratch[count] = bStart + bSpan * 0.48f
      colorScratch[count++] = 0x76FFFFFF
      posScratch[count] = bStart + bSpan * 0.62f
      colorScratch[count++] = 0x3EFFFFFF
      posScratch[count] = bStart + bSpan * 0.76f
      colorScratch[count++] = 0x18FFFFFF
      posScratch[count] = bStart + bSpan * 0.88f
      colorScratch[count++] = 0x06FFFFFF
      posScratch[count] = bEnd
      colorScratch[count++] = 0x00FFFFFF
      if (bEnd < 0.999f) {
        posScratch[count] = 1f
        colorScratch[count++] = 0x00FFFFFF
      }
    } else {
      posScratch[count] = 1f
      colorScratch[count++] = 0xFFFFFFFF.toInt()
    }

    val positions = FloatArray(count)
    val colors = IntArray(count)
    System.arraycopy(posScratch, 0, positions, 0, count)
    System.arraycopy(colorScratch, 0, colors, 0, count)

    maskPaint.shader = LinearGradient(0f, 0f, 0f, height.toFloat(), colors, positions, Shader.TileMode.CLAMP)
  }

  override fun dispatchDraw(canvas: Canvas) {
    val w = width
    val h = height
    val hasTop = (topFadeEnd - topFadeStart) > 0.005f
    val hasBottom = (fadeEnd - fadeStart) > 0.005f
    if (w <= 0 || h <= 0 || (!hasTop && !hasBottom)) {
      super.dispatchDraw(canvas)
      return
    }

    ensureShader(h)
    val saveCount = canvas.saveLayer(0f, 0f, w.toFloat(), h.toFloat(), null)
    super.dispatchDraw(canvas)
    canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), maskPaint)
    canvas.restoreToCount(saveCount)
  }
}
