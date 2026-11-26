package cn.toside.music.mobile.view

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.view.View
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * 120Hz Banding-Free Native Fluid Mesh Background View.
 */
class FluidBgView(context: Context) : View(context) {
  companion object {
    private const val ORB_COUNT = 4
    private const val TRANSITION_DURATION_NS = 760_000_000L
    private val GRADIENT_STOPS = floatArrayOf(0f, 0.28f, 0.56f, 0.82f, 1.0f)
    private val ALPHA_FALLOFF = floatArrayOf(1.00f, 0.74f, 0.36f, 0.09f, 0.0f)

    @Volatile
    private var sNoiseShader: BitmapShader? = null
    private val noiseLock = Any()

    private fun fract(v: Double): Double = v - floor(v)

    private fun ensureNoiseShader() {
      if (sNoiseShader != null) return
      synchronized(noiseLock) {
        if (sNoiseShader != null) return
        val size = 64
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val pixels = IntArray(size * size)
        for (y in 0 until size) {
          for (x in 0 until size) {
            val inner = 0.06711056 * x + 0.00583715 * y
            val ign = fract(52.9829189 * fract(inner))
            val bright = ign >= 0.5
            val mag = abs(ign - 0.5) * 2.0
            val alpha = 2 + (mag * 4.0).roundToInt()
            pixels[y * size + x] = if (bright) {
              Color.argb(alpha, 255, 255, 255)
            } else {
              Color.argb(alpha, 0, 0, 0)
            }
          }
        }
        bmp.setPixels(pixels, 0, size, 0, 0, size, size)
        sNoiseShader = BitmapShader(bmp, Shader.TileMode.REPEAT, Shader.TileMode.REPEAT)
      }
    }

    private fun lerpArgb(start: Int, end: Int, t: Float): Int {
      val a = (Color.alpha(start) + (Color.alpha(end) - Color.alpha(start)) * t).roundToInt()
      val r = (Color.red(start) + (Color.red(end) - Color.red(start)) * t).roundToInt()
      val g = (Color.green(start) + (Color.green(end) - Color.green(start)) * t).roundToInt()
      val b = (Color.blue(start) + (Color.blue(end) - Color.blue(start)) * t).roundToInt()
      return Color.argb(a, r, g, b)
    }
  }

  private val basePaint = Paint(Paint.DITHER_FLAG)
  private val orbPaints = Array(ORB_COUNT) { Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG) }
  private val orbShaders = arrayOfNulls<RadialGradient>(ORB_COUNT)
  private val builtOrbColors = IntArray(ORB_COUNT)
  private val shaderMatrix = Matrix()
  private val noisePaint = Paint(Paint.DITHER_FLAG)
  private val scratchStopColors = IntArray(5)

  private var startBaseColor = 0xFF141316.toInt()
  private var targetBaseColor = 0xFF141316.toInt()
  private var currentBaseColor = 0xFF141316.toInt()

  private val startOrbColors = intArrayOf(0x664DAF7C, 0x523B82CE, 0x477C5CCC, 0x3D2D6A4F)
  private val targetOrbColors = intArrayOf(0x664DAF7C, 0x523B82CE, 0x477C5CCC, 0x3D2D6A4F)
  private val currentOrbColors = intArrayOf(0x664DAF7C, 0x523B82CE, 0x477C5CCC, 0x3D2D6A4F)

  private var hasInitialBaseColor = false
  private var hasInitialOrbColors = false
  private var transitionActive = false
  private var transitionStartNs = 0L

  private var playing = false
  private var isAttached = false
  private var windowVisible = true
  private var frameScheduled = false

  private var accumulatedPhaseSec = 0.0
  private var lastFrameNs = 0L

  init {
    ensureNoiseShader()
    sNoiseShader?.let { noisePaint.shader = it }
    rebuildOrbShaders()
  }

  fun setBaseColorValue(color: Int) {
    if (!hasInitialBaseColor) {
      hasInitialBaseColor = true
      startBaseColor = color
      targetBaseColor = color
      currentBaseColor = color
      invalidate()
      return
    }
    if (targetBaseColor == color) return
    startBaseColor = currentBaseColor
    targetBaseColor = color
    startColorTransition()
  }

  fun setOrbColors(colors: IntArray?) {
    if (colors == null || colors.isEmpty()) return
    val normalized = IntArray(ORB_COUNT) { i -> colors[i % colors.size] }
    if (!hasInitialOrbColors) {
      hasInitialOrbColors = true
      System.arraycopy(normalized, 0, startOrbColors, 0, ORB_COUNT)
      System.arraycopy(normalized, 0, targetOrbColors, 0, ORB_COUNT)
      System.arraycopy(normalized, 0, currentOrbColors, 0, ORB_COUNT)
      rebuildOrbShaders()
      invalidate()
      return
    }
    if (targetOrbColors.contentEquals(normalized)) return
    System.arraycopy(currentOrbColors, 0, startOrbColors, 0, ORB_COUNT)
    System.arraycopy(normalized, 0, targetOrbColors, 0, ORB_COUNT)
    startColorTransition()
  }

  fun setPlaying(playing: Boolean) {
    if (this.playing == playing) return
    this.playing = playing
    lastFrameNs = 0L
    scheduleNextFrameIfNeeded()
  }

  private fun startColorTransition() {
    System.arraycopy(currentOrbColors, 0, startOrbColors, 0, ORB_COUNT)
    startBaseColor = currentBaseColor
    transitionStartNs = System.nanoTime()
    transitionActive = true
    scheduleNextFrameIfNeeded()
    invalidate()
  }

  private fun shouldAnimate(): Boolean =
    isAttached && windowVisible && isShown && (playing || transitionActive)

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

  private fun rebuildOrbShaders() {
    for (i in 0 until ORB_COUNT) {
      val c = currentOrbColors[i]
      if (orbShaders[i] != null && builtOrbColors[i] == c) continue
      builtOrbColors[i] = c
      val baseAlpha = Color.alpha(c)
      val r = Color.red(c)
      val g = Color.green(c)
      val b = Color.blue(c)
      for (s in GRADIENT_STOPS.indices) {
        val a = min(255, max(0, (baseAlpha * ALPHA_FALLOFF[s]).roundToInt()))
        scratchStopColors[s] = Color.argb(a, r, g, b)
      }
      val grad = RadialGradient(
        0f,
        0f,
        1f,
        scratchStopColors,
        GRADIENT_STOPS,
        Shader.TileMode.CLAMP,
      )
      orbShaders[i] = grad
      orbPaints[i].shader = grad
    }
  }

  override fun onDraw(canvas: Canvas) {
    frameScheduled = false
    val w = width
    val h = height
    if (w <= 0 || h <= 0) return

    val nowNs = System.nanoTime()
    if (playing) {
      if (lastFrameNs != 0L) {
        val dt = (nowNs - lastFrameNs) / 1_000_000_000.0
        if (dt > 0.0 && dt < 0.1) {
          accumulatedPhaseSec += dt
        }
      }
      lastFrameNs = nowNs
    } else {
      lastFrameNs = 0L
    }

    if (transitionActive) {
      val raw = (nowNs - transitionStartNs) / TRANSITION_DURATION_NS.toFloat()
      if (raw >= 1.0f) {
        transitionActive = false
        currentBaseColor = targetBaseColor
        System.arraycopy(targetOrbColors, 0, currentOrbColors, 0, ORB_COUNT)
      } else {
        val clamped = max(0f, raw)
        val inv = 1.0f - clamped
        val eased = 1.0f - inv * inv * inv
        currentBaseColor = lerpArgb(startBaseColor, targetBaseColor, eased)
        for (i in 0 until ORB_COUNT) {
          currentOrbColors[i] = lerpArgb(startOrbColors[i], targetOrbColors[i], eased)
        }
      }
      rebuildOrbShaders()
    }

    basePaint.color = currentBaseColor
    canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), basePaint)

    val maxDim = max(w, h).toFloat()
    val t = accumulatedPhaseSec

    drawOrb(
      canvas, 0, w, h,
      w * (0.20f + 0.16f * sin(t * 0.27 + 0.4).toFloat()),
      h * (0.18f + 0.13f * cos(t * 0.21 + 0.2).toFloat()),
      maxDim * (0.78f + 0.05f * sin(t * 0.33).toFloat()),
    )

    drawOrb(
      canvas, 1, w, h,
      w * (0.82f + 0.14f * cos(t * 0.23 + 1.7).toFloat()),
      h * (0.30f + 0.15f * sin(t * 0.19 + 1.1).toFloat()),
      maxDim * (0.74f + 0.05f * cos(t * 0.29 + 0.8).toFloat()),
    )

    drawOrb(
      canvas, 2, w, h,
      w * (0.26f + 0.18f * cos(t * 0.18 + 3.1).toFloat()),
      h * (0.68f + 0.14f * sin(t * 0.24 + 2.4).toFloat()),
      maxDim * (0.72f + 0.04f * sin(t * 0.25 + 2.0).toFloat()),
    )

    drawOrb(
      canvas, 3, w, h,
      w * (0.78f + 0.15f * sin(t * 0.20 + 4.5).toFloat()),
      h * (0.82f + 0.12f * cos(t * 0.16 + 3.8).toFloat()),
      maxDim * (0.80f + 0.05f * cos(t * 0.22 + 3.1).toFloat()),
    )

    if (sNoiseShader != null) {
      canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), noisePaint)
    }

    scheduleNextFrameIfNeeded()
  }

  private fun drawOrb(canvas: Canvas, idx: Int, w: Int, h: Int, cx: Float, cy: Float, radius: Float) {
    val shader = orbShaders[idx] ?: return
    if (radius <= 1f) return
    shaderMatrix.setScale(radius, radius)
    shaderMatrix.postTranslate(cx, cy)
    shader.setLocalMatrix(shaderMatrix)
    canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), orbPaints[idx])
  }
}
