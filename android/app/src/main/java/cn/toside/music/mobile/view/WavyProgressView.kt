package cn.toside.music.mobile.view

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * M3 Expressive wavy progress indicator for PlayDetail and PlayerBar.
 *
 * Draws a gentle animated sine wave on the played portion while playing and
 * smoothly eases to a crisp flat track when paused or dragging.
 */
class WavyProgressView(context: Context) : View(context) {
  companion object {
    private const val TWO_PI = (PI * 2.0).toFloat()
    private const val EPSILON = 0.005f

    private fun clamp01(value: Float): Float = when {
      value.isNaN() || value < 0f -> 0f
      value > 1f -> 1f
      else -> value
    }
  }

  private val activePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
    color = 0xFF4DAF7C.toInt()
  }
  private val bufferedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
    color = 0x474DAF7C
  }
  private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
    color = 0x28000000
  }
  private val thumbPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.FILL
    color = 0xFF4DAF7C.toInt()
  }
  private val wavePath = Path()
  private val thumbRect = RectF()

  private var progress = 0f
  private var buffered = 0f
  private var playing = false
  private var dragging = false

  private var amplitudeDp = 2.3f
  private var wavelengthDp = 34f
  private var waveSpeed = 1.8f
  private var strokeWidthDp = 3.4f
  private var inactiveStrokeWidthDp = 3.0f
  private var showThumb = true
  private var thumbGapDp = 5.5f
  private var thumbWidthDp = 4.5f
  private var thumbHeightDp = 17f

  private var ampFactor = 0f
  private var dragFactor = 0f
  private var phaseRad = 0f
  private var lastFrameNs = 0L

  private var isAttached = false
  private var windowVisible = true
  private var frameScheduled = false
  private var hasDrawnOnce = false

  fun setProgress(progress: Float) {
    val next = clamp01(progress)
    if (abs(this.progress - next) > 0.0001f) {
      this.progress = next
      invalidate()
    }
  }

  fun setBuffered(buffered: Float) {
    val next = clamp01(buffered)
    if (abs(this.buffered - next) > 0.0001f) {
      this.buffered = next
      invalidate()
    }
  }

  fun setPlaying(playing: Boolean) {
    if (this.playing == playing) return
    this.playing = playing
    lastFrameNs = 0L
    scheduleNextFrameIfNeeded()
    invalidate()
  }

  fun setDragging(dragging: Boolean) {
    if (this.dragging == dragging) return
    this.dragging = dragging
    lastFrameNs = 0L
    scheduleNextFrameIfNeeded()
    invalidate()
  }

  fun setActiveColor(color: Int) {
    if (activePaint.color != color) {
      activePaint.color = color
      thumbPaint.color = color
      invalidate()
    }
  }

  fun setBufferedColor(color: Int) {
    if (bufferedPaint.color != color) {
      bufferedPaint.color = color
      invalidate()
    }
  }

  fun setTrackColor(color: Int) {
    if (trackPaint.color != color) {
      trackPaint.color = color
      invalidate()
    }
  }

  fun setAmplitude(amplitudeDp: Float) {
    val next = max(0f, amplitudeDp)
    if (this.amplitudeDp != next) {
      this.amplitudeDp = next
      invalidate()
    }
  }

  fun setWavelength(wavelengthDp: Float) {
    val next = max(8f, wavelengthDp)
    if (this.wavelengthDp != next) {
      this.wavelengthDp = next
      invalidate()
    }
  }

  fun setWaveSpeed(waveSpeed: Float) {
    val next = max(0f, waveSpeed)
    if (this.waveSpeed != next) {
      this.waveSpeed = next
      invalidate()
    }
  }

  fun setStrokeWidthDp(strokeWidthDp: Float) {
    val next = max(1f, strokeWidthDp)
    if (this.strokeWidthDp != next) {
      this.strokeWidthDp = next
      invalidate()
    }
  }

  fun setInactiveStrokeWidthDp(inactiveStrokeWidthDp: Float) {
    val next = max(1f, inactiveStrokeWidthDp)
    if (this.inactiveStrokeWidthDp != next) {
      this.inactiveStrokeWidthDp = next
      invalidate()
    }
  }

  fun setShowThumb(showThumb: Boolean) {
    if (this.showThumb != showThumb) {
      this.showThumb = showThumb
      invalidate()
    }
  }

  fun setThumbGapDp(thumbGapDp: Float) {
    val next = max(0f, thumbGapDp)
    if (this.thumbGapDp != next) {
      this.thumbGapDp = next
      invalidate()
    }
  }

  fun setThumbWidthDp(thumbWidthDp: Float) {
    val next = max(1f, thumbWidthDp)
    if (this.thumbWidthDp != next) {
      this.thumbWidthDp = next
      invalidate()
    }
  }

  fun setThumbHeightDp(thumbHeightDp: Float) {
    val next = max(2f, thumbHeightDp)
    if (this.thumbHeightDp != next) {
      this.thumbHeightDp = next
      invalidate()
    }
  }

  private fun shouldAnimate(): Boolean {
    val targetAmp = if (playing && !dragging) 1f else 0f
    val targetDrag = if (dragging) 1f else 0f
    return isAttached && windowVisible && isShown && (
      (playing && !dragging) ||
        abs(targetAmp - ampFactor) >= EPSILON ||
        abs(targetDrag - dragFactor) >= EPSILON
      )
  }

  private fun scheduleNextFrameIfNeeded() {
    if (shouldAnimate() && !frameScheduled) {
      frameScheduled = true
      postInvalidateOnAnimation()
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    isAttached = true
    lastFrameNs = 0L
    scheduleNextFrameIfNeeded()
  }

  override fun onDetachedFromWindow() {
    isAttached = false
    frameScheduled = false
    lastFrameNs = 0L
    super.onDetachedFromWindow()
  }

  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    windowVisible = visibility == VISIBLE
    lastFrameNs = 0L
    if (windowVisible) {
      scheduleNextFrameIfNeeded()
    }
  }

  override fun onVisibilityChanged(changedView: View, visibility: Int) {
    super.onVisibilityChanged(changedView, visibility)
    lastFrameNs = 0L
    if (visibility == VISIBLE) {
      scheduleNextFrameIfNeeded()
    }
  }

  private fun drawWavySegment(
    canvas: Canvas,
    x1: Float,
    x2: Float,
    cy: Float,
    ampPx: Float,
    wavelengthPx: Float,
    fadeLenPx: Float,
    density: Float,
  ) {
    wavePath.reset()
    val step = max(2f, density * 1.5f)
    val k = TWO_PI / max(8f * density, wavelengthPx)
    var started = false
    var x = x1
    while (x < x2) {
      val edgeFade = min(1f, min((x - x1) / fadeLenPx, (x2 - x) / fadeLenPx))
      val y = cy + sin((x * k - phaseRad).toDouble()).toFloat() * ampPx * max(0f, edgeFade)
      if (!started) {
        wavePath.moveTo(x, y)
        started = true
      } else {
        wavePath.lineTo(x, y)
      }
      x += step
    }
    if (!started) {
      wavePath.moveTo(x1, cy)
    }
    wavePath.lineTo(x2, cy)
    canvas.drawPath(wavePath, activePaint)
  }

  override fun onDraw(canvas: Canvas) {
    frameScheduled = false
    val width = width
    val height = height
    if (width <= 0 || height <= 0) return

    val nowNs = System.nanoTime()
    var dt = 0f
    if (lastFrameNs != 0L) {
      val rawDt = (nowNs - lastFrameNs) / 1_000_000_000.0
      if (rawDt > 0.0 && rawDt < 0.1) {
        dt = rawDt.toFloat()
      }
    }
    lastFrameNs = nowNs

    val targetAmp = if (playing && !dragging) 1f else 0f
    val targetDrag = if (dragging) 1f else 0f
    if (!hasDrawnOnce) {
      hasDrawnOnce = true
      ampFactor = targetAmp
      dragFactor = targetDrag
    } else if (dt > 0f) {
      ampFactor += (targetAmp - ampFactor) * min(1f, dt * 11f)
      if (abs(targetAmp - ampFactor) < EPSILON) ampFactor = targetAmp

      dragFactor += (targetDrag - dragFactor) * min(1f, dt * 14f)
      if (abs(targetDrag - dragFactor) < EPSILON) dragFactor = targetDrag

      if (playing && !dragging) {
        phaseRad = (phaseRad + dt * waveSpeed) % TWO_PI
      }
    }

    val density = resources.displayMetrics.density
    val cy = height * 0.5f
    val wavelengthPx = wavelengthDp * density

    if (showThumb) {
      val curThumbW = (thumbWidthDp + 1.2f * dragFactor) * density
      val curThumbH = (thumbHeightDp + 4.0f * dragFactor) * density
      val padX = max(curThumbW * 0.5f + 2f * density, strokeWidthDp * 0.5f * density)
      val trackStart = padX
      val trackEnd = width - padX
      val trackW = max(1f, trackEnd - trackStart)
      val curX = trackStart + trackW * progress
      val bufX = trackStart + trackW * max(progress, buffered)
      val gapPx = thumbGapDp * density
      val activeEnd = max(trackStart, curX - curThumbW * 0.5f - gapPx)
      val inactiveStart = min(trackEnd, curX + curThumbW * 0.5f + gapPx)

      val rightStrokePx = inactiveStrokeWidthDp * density
      trackPaint.strokeWidth = rightStrokePx
      bufferedPaint.strokeWidth = rightStrokePx

      if (inactiveStart < trackEnd) {
        canvas.drawLine(inactiveStart, cy, trackEnd, cy, trackPaint)
        if (bufX > inactiveStart) {
          canvas.drawLine(inactiveStart, cy, min(trackEnd, bufX), cy, bufferedPaint)
        }
      }

      val curAmp = amplitudeDp * density * ampFactor
      if (activeEnd > trackStart) {
        if (curAmp > 0.15f && activeEnd - trackStart > 2f * density) {
          activePaint.strokeWidth = strokeWidthDp * density
          drawWavySegment(canvas, trackStart, activeEnd, cy, curAmp, wavelengthPx, 8f * density, density)
        } else {
          activePaint.strokeWidth = (strokeWidthDp + 0.4f) * density
          canvas.drawLine(trackStart, cy, activeEnd, cy, activePaint)
        }
      }

      thumbRect.set(
        curX - curThumbW * 0.5f,
        cy - curThumbH * 0.5f,
        curX + curThumbW * 0.5f,
        cy + curThumbH * 0.5f,
      )
      canvas.drawRoundRect(thumbRect, curThumbW * 0.5f, curThumbW * 0.5f, thumbPaint)
    } else {
      val curStrokePx = (strokeWidthDp + 1.2f * dragFactor) * density
      val padX = curStrokePx * 0.5f + 1f * density
      val trackStart = padX
      val trackEnd = width - padX
      val trackW = max(1f, trackEnd - trackStart)
      val curX = trackStart + trackW * progress
      val bufX = trackStart + trackW * max(progress, buffered)

      val rightStrokePx = (inactiveStrokeWidthDp + 1.2f * dragFactor) * density
      trackPaint.strokeWidth = rightStrokePx
      bufferedPaint.strokeWidth = rightStrokePx

      canvas.drawLine(trackStart, cy, trackEnd, cy, trackPaint)
      if (bufX > trackStart) {
        canvas.drawLine(trackStart, cy, min(trackEnd, bufX), cy, bufferedPaint)
      }

      val curAmp = amplitudeDp * density * ampFactor
      if (curX > trackStart) {
        activePaint.strokeWidth = curStrokePx
        if (curAmp > 0.1f && curX - trackStart > 2f * density) {
          drawWavySegment(canvas, trackStart, curX, cy, curAmp, wavelengthPx, 6f * density, density)
        } else {
          canvas.drawLine(trackStart, cy, curX, cy, activePaint)
        }
      }
    }

    scheduleNextFrameIfNeeded()
  }
}
