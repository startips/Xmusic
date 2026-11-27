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
import android.os.PowerManager
import android.view.View
import cn.toside.music.mobile.player.dsp.AudioSpectrumEngine
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
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
    private const val STEADY_FRAME_INTERVAL_MS = 33L
    private const val REACTIVE_FRAME_INTERVAL_MS = 22L
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

  private val powerManager: PowerManager? =
    context.applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
  private var playing = false
  private var audioReactive = false
  private var spectrumRegistered = false
  private var powerSaveMode = false
  private var isAttached = false
  private var windowVisible = true
  private var frameScheduled = false
  private val energyBuf = FloatArray(3)
  private var smoothBass = 0f
  private var smoothMid = 0f
  private var smoothTreble = 0f
  private val steadyFrameRunnable = Runnable {
    frameScheduled = false
    if (shouldAnimate()) {
      invalidate()
    }
  }

  private var accumulatedPhaseSec = 0.0
  private var lastFrameNs = 0L

  init {
    refreshPowerSaveState()
    ensureNoiseShader()
    sNoiseShader?.let { noisePaint.shader = it }
    rebuildOrbShaders()
  }

  private fun refreshPowerSaveState() {
    powerSaveMode = try {
      powerManager?.isPowerSaveMode == true
    } catch (_: Exception) {
      false
    }
  }

  private fun cancelScheduledFrames() {
    removeCallbacks(steadyFrameRunnable)
    frameScheduled = false
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

  private fun syncSpectrumRegistration() {
    val want = audioReactive && playing && isAttached && windowVisible && isShown && !powerSaveMode
    if (want == spectrumRegistered) return
    spectrumRegistered = want
    if (want) {
      AudioSpectrumEngine.registerConsumer()
    } else {
      AudioSpectrumEngine.unregisterConsumer()
    }
  }

  fun setAudioReactive(reactive: Boolean) {
    if (this.audioReactive == reactive) return
    this.audioReactive = reactive
    if (!reactive) {
      smoothBass = 0f
      smoothMid = 0f
      smoothTreble = 0f
      for (i in 0 until ORB_COUNT) orbPaints[i].alpha = 255
    }
    syncSpectrumRegistration()
    if (!frameScheduled) scheduleNextFrameIfNeeded()
    invalidate()
  }

  fun setPlaying(playing: Boolean) {
    refreshPowerSaveState()
    if (this.playing == playing) {
      syncSpectrumRegistration()
      if (playing && !frameScheduled) scheduleNextFrameIfNeeded()
      return
    }
    this.playing = playing
    lastFrameNs = 0L
    syncSpectrumRegistration()
    if (!playing && !transitionActive) {
      cancelScheduledFrames()
    } else {
      scheduleNextFrameIfNeeded()
    }
  }

  private fun startColorTransition() {
    System.arraycopy(currentOrbColors, 0, startOrbColors, 0, ORB_COUNT)
    startBaseColor = currentBaseColor
    transitionStartNs = System.nanoTime()
    transitionActive = true
    cancelScheduledFrames()
    scheduleNextFrameIfNeeded()
    invalidate()
  }

  private fun shouldAnimate(): Boolean =
    isAttached && windowVisible && isShown && (transitionActive || (playing && !powerSaveMode))

  private fun scheduleNextFrameIfNeeded() {
    if (!shouldAnimate() || frameScheduled) return
    frameScheduled = true
    if (transitionActive) {
      postInvalidateOnAnimation()
    } else {
      val interval = if (audioReactive) REACTIVE_FRAME_INTERVAL_MS else STEADY_FRAME_INTERVAL_MS
      postOnAnimationDelayed(steadyFrameRunnable, interval)
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    isAttached = true
    refreshPowerSaveState()
    lastFrameNs = 0L
    syncSpectrumRegistration()
    scheduleNextFrameIfNeeded()
  }

  override fun onDetachedFromWindow() {
    isAttached = false
    syncSpectrumRegistration()
    cancelScheduledFrames()
    lastFrameNs = 0L
    super.onDetachedFromWindow()
  }

  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    windowVisible = visibility == VISIBLE
    lastFrameNs = 0L
    syncSpectrumRegistration()
    if (windowVisible) {
      refreshPowerSaveState()
      syncSpectrumRegistration()
      scheduleNextFrameIfNeeded()
    } else {
      cancelScheduledFrames()
    }
  }

  override fun onVisibilityChanged(changedView: View, visibility: Int) {
    super.onVisibilityChanged(changedView, visibility)
    lastFrameNs = 0L
    syncSpectrumRegistration()
    if (visibility == VISIBLE) {
      refreshPowerSaveState()
      syncSpectrumRegistration()
      scheduleNextFrameIfNeeded()
    } else {
      cancelScheduledFrames()
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
    var dtSec = 0.033f
    if (playing) {
      if (lastFrameNs != 0L) {
        val dt = (nowNs - lastFrameNs) / 1_000_000_000.0
        if (dt > 0.0 && dt < 0.25) {
          accumulatedPhaseSec += dt
          dtSec = dt.toFloat()
        }
      }
      lastFrameNs = nowNs
    } else {
      lastFrameNs = 0L
    }

    if (audioReactive && playing && !powerSaveMode && AudioSpectrumEngine.sampleSpectrum(null, energyBuf, nowNs)) {
      val atk = 1.0f - exp(-dtSec * 16.0f)
      val dec = 1.0f - exp(-dtSec * 5.0f)
      smoothBass += (energyBuf[0] - smoothBass) * (if (energyBuf[0] > smoothBass) atk else dec)
      smoothMid += (energyBuf[1] - smoothMid) * (if (energyBuf[1] > smoothMid) atk else dec)
      smoothTreble += (energyBuf[2] - smoothTreble) * (if (energyBuf[2] > smoothTreble) atk else dec)
    } else {
      val dec = 1.0f - exp(-dtSec * 6.0f)
      smoothBass -= smoothBass * dec
      smoothMid -= smoothMid * dec
      smoothTreble -= smoothTreble * dec
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

    val bassScale = 1.0f + smoothBass * 0.18f
    val midScale = 1.0f + smoothMid * 0.13f + smoothTreble * 0.05f
    if (audioReactive) {
      val bassAlpha = (222 + (smoothBass * 33f).roundToInt()).coerceIn(222, 255)
      val midAlpha = (222 + (smoothMid * 33f).roundToInt()).coerceIn(222, 255)
      orbPaints[0].alpha = bassAlpha
      orbPaints[1].alpha = midAlpha
      orbPaints[2].alpha = midAlpha
      orbPaints[3].alpha = bassAlpha
    }

    drawOrb(
      canvas, 0, w, h,
      w * (0.20f + 0.16f * sin(t * 0.27 + 0.4).toFloat()),
      h * (0.18f + 0.13f * cos(t * 0.21 + 0.2).toFloat()),
      maxDim * (0.78f + 0.05f * sin(t * 0.33).toFloat()) * bassScale,
    )

    drawOrb(
      canvas, 1, w, h,
      w * (0.82f + 0.14f * cos(t * 0.23 + 1.7).toFloat()),
      h * (0.30f + 0.15f * sin(t * 0.19 + 1.1).toFloat()),
      maxDim * (0.74f + 0.05f * cos(t * 0.29 + 0.8).toFloat()) * midScale,
    )

    drawOrb(
      canvas, 2, w, h,
      w * (0.26f + 0.18f * cos(t * 0.18 + 3.1).toFloat()),
      h * (0.68f + 0.14f * sin(t * 0.24 + 2.4).toFloat()),
      maxDim * (0.72f + 0.04f * sin(t * 0.25 + 2.0).toFloat()) * midScale,
    )

    drawOrb(
      canvas, 3, w, h,
      w * (0.78f + 0.15f * sin(t * 0.20 + 4.5).toFloat()),
      h * (0.82f + 0.12f * cos(t * 0.16 + 3.8).toFloat()),
      maxDim * (0.80f + 0.05f * cos(t * 0.22 + 3.1).toFloat()) * bassScale,
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
