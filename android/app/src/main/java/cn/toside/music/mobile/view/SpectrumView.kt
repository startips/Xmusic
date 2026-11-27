package cn.toside.music.mobile.view

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.os.PowerManager
import android.view.View
import cn.toside.music.mobile.player.dsp.AudioSpectrumEngine
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Native hardware-accelerated M3E Audio Spectrum Visualizer View.
 * Supports mirrored capsule bars ("bars") and 3-layer organic aurora ribbons ("ribbon"),
 * driven zero-GC directly from [AudioSpectrumEngine].
 */
class SpectrumView(context: Context) : View(context) {
  companion object {
    const val MODE_BARS = "bars"
    const val MODE_RIBBON = "ribbon"
    private const val BANDS = AudioSpectrumEngine.BAND_COUNT
    private const val LAYER_COUNT = 3
    private val RIBBON_ALPHAS = floatArrayOf(0.16f, 0.26f, 0.42f)
  }

  private val density = context.resources.displayMetrics.density
  private val powerManager: PowerManager? =
    context.applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager

  private var mode: String = MODE_BARS
  private var playing = false
  private var intensity = 1.0f
  private var primaryColor = 0xFF4DAF7C.toInt()
  private var secondaryColor = 0xFF3B82CE.toInt()
  private var tertiaryColor = 0xFF7C5CCC.toInt()

  private var powerSaveMode = false
  private var isAttached = false
  private var windowVisible = true
  private var consumerRegistered = false
  private var frameScheduled = false
  private var lastFrameNs = 0L

  private val rawBands = FloatArray(BANDS)
  private val smoothBands = FloatArray(BANDS)
  private val displayBands = FloatArray(BANDS)
  private val barEdgeTaper = FloatArray(BANDS) { i ->
    val norm = i.toFloat() / (BANDS - 1).toFloat()
    (0.35 + 0.65 * sin(PI * norm)).toFloat()
  }

  private val barRect = RectF()
  private val barPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val ribbonPaints = Array(LAYER_COUNT) { Paint(Paint.ANTI_ALIAS_FLAG) }
  private val crestPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
    strokeWidth = 1.5f * density
  }
  private val ribbonPaths = Array(LAYER_COUNT) { Path() }
  private val crestPath = Path()
  private val pointX = FloatArray(BANDS + 2)
  private val pointY = FloatArray(BANDS + 2)

  private var cachedShaderW = -1
  private var cachedShaderH = -1
  private var shadersDirty = true

  private val frameRunnable = Runnable {
    frameScheduled = false
    invalidate()
  }

  init {
    refreshPowerSaveState()
    setWillNotDraw(false)
  }

  private fun refreshPowerSaveState() {
    powerSaveMode = try {
      powerManager?.isPowerSaveMode == true
    } catch (_: Exception) {
      false
    }
  }

  private fun syncConsumerRegistration() {
    val want = isAttached && windowVisible && isShown && playing && !powerSaveMode
    if (want == consumerRegistered) return
    consumerRegistered = want
    if (want) {
      AudioSpectrumEngine.registerConsumer()
    } else {
      AudioSpectrumEngine.unregisterConsumer()
    }
  }

  fun setMode(mode: String?) {
    val next = if (mode == MODE_RIBBON) MODE_RIBBON else MODE_BARS
    if (this.mode == next) return
    this.mode = next
    shadersDirty = true
    invalidate()
  }

  fun setPlaying(playing: Boolean) {
    refreshPowerSaveState()
    if (this.playing == playing) {
      syncConsumerRegistration()
      if (playing && !frameScheduled) scheduleNextFrame(force = true)
      return
    }
    this.playing = playing
    lastFrameNs = 0L
    syncConsumerRegistration()
    scheduleNextFrame(force = true)
    invalidate()
  }

  fun setPrimaryColorValue(color: Int) {
    if (primaryColor == color) return
    primaryColor = color
    shadersDirty = true
    invalidate()
  }

  fun setSecondaryColorValue(color: Int) {
    if (secondaryColor == color) return
    secondaryColor = color
    shadersDirty = true
    invalidate()
  }

  fun setTertiaryColorValue(color: Int) {
    if (tertiaryColor == color) return
    tertiaryColor = color
    shadersDirty = true
    invalidate()
  }

  fun setIntensityValue(value: Float) {
    val next = value.coerceIn(0.05f, 1.0f)
    if (intensity == next) return
    intensity = next
    shadersDirty = true
    invalidate()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    isAttached = true
    refreshPowerSaveState()
    lastFrameNs = 0L
    syncConsumerRegistration()
    scheduleNextFrame(force = true)
  }

  override fun onDetachedFromWindow() {
    isAttached = false
    removeCallbacks(frameRunnable)
    frameScheduled = false
    lastFrameNs = 0L
    syncConsumerRegistration()
    super.onDetachedFromWindow()
  }

  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    windowVisible = visibility == VISIBLE
    lastFrameNs = 0L
    if (windowVisible) refreshPowerSaveState()
    syncConsumerRegistration()
    if (windowVisible) {
      scheduleNextFrame(force = true)
      invalidate()
    } else {
      removeCallbacks(frameRunnable)
      frameScheduled = false
    }
  }

  override fun onVisibilityChanged(changedView: View, visibility: Int) {
    super.onVisibilityChanged(changedView, visibility)
    lastFrameNs = 0L
    if (visibility == VISIBLE) refreshPowerSaveState()
    syncConsumerRegistration()
    if (visibility == VISIBLE) {
      scheduleNextFrame(force = true)
      invalidate()
    } else {
      removeCallbacks(frameRunnable)
      frameScheduled = false
    }
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    shadersDirty = true
  }

  private fun ensureShaders(w: Int, h: Int) {
    if (!shadersDirty && cachedShaderW == w && cachedShaderH == h) return
    cachedShaderW = w
    cachedShaderH = h
    shadersDirty = false

    val barTop = scaleAlpha(primaryColor, 0.92f * intensity)
    val barBottom = scaleAlpha(secondaryColor, 0.48f * intensity)
    barPaint.shader = LinearGradient(
      0f, 0f, 0f, h.toFloat(),
      barTop, barBottom, Shader.TileMode.CLAMP,
    )

    val layerColors = intArrayOf(tertiaryColor, secondaryColor, primaryColor)
    for (layer in 0 until LAYER_COUNT) {
      val topColor = scaleAlpha(layerColors[layer], RIBBON_ALPHAS[layer] * intensity)
      val botColor = scaleAlpha(layerColors[layer], 0.02f * intensity)
      ribbonPaints[layer].shader = LinearGradient(
        0f, 0f, 0f, h.toFloat(),
        topColor, botColor, Shader.TileMode.CLAMP,
      )
    }
    crestPaint.color = scaleAlpha(primaryColor, 0.68f * intensity)
  }

  private fun scaleAlpha(color: Int, factor: Float): Int {
    val a = (Color.alpha(color) * factor).roundToInt().coerceIn(0, 255)
    return Color.argb(a, Color.red(color), Color.green(color), Color.blue(color))
  }

  private fun scheduleNextFrame(force: Boolean = false) {
    if (!isAttached || !windowVisible || !isShown || frameScheduled) return
    val hasResidual = maxDisplayEnergy() > 0.004f
    if (!force && !(playing && !powerSaveMode) && !hasResidual) return
    frameScheduled = true
    postOnAnimation(frameRunnable)
  }

  private fun maxDisplayEnergy(): Float {
    var m = 0f
    for (i in 0 until BANDS) {
      if (smoothBands[i] > m) m = smoothBands[i]
    }
    return m
  }

  override fun onDraw(canvas: Canvas) {
    frameScheduled = false
    val w = width
    val h = height
    if (w <= 0 || h <= 0) return

    ensureShaders(w, h)

    val nowNs = System.nanoTime()
    var dtSec = 0.016f
    if (lastFrameNs != 0L) {
      val dt = (nowNs - lastFrameNs) / 1_000_000_000.0
      if (dt > 0.0 && dt < 0.25) dtSec = dt.toFloat()
    }
    lastFrameNs = nowNs

    val hasAudio = playing && !powerSaveMode &&
      AudioSpectrumEngine.sampleSpectrum(rawBands, null, nowNs)

    val atk = 1.0f - exp(-dtSec * 20.0f)
    val dec = 1.0f - exp(-dtSec * 7.5f)
    for (i in 0 until BANDS) {
      val target = if (hasAudio) rawBands[i] else 0f
      val cur = smoothBands[i]
      smoothBands[i] = cur + (target - cur) * (if (target > cur) atk else dec)
    }

    // 3-tap spatial smoothing so adjacent capsules / ribbon points undulate organically
    for (i in 0 until BANDS) {
      val prev = smoothBands[max(0, i - 1)]
      val cur = smoothBands[i]
      val next = smoothBands[min(BANDS - 1, i + 1)]
      displayBands[i] = prev * 0.20f + cur * 0.60f + next * 0.20f
    }

    if (mode == MODE_RIBBON) {
      drawRibbons(canvas, w.toFloat(), h.toFloat())
    } else {
      drawMirroredBars(canvas, w.toFloat(), h.toFloat())
    }

    scheduleNextFrame(force = false)
  }

  private fun drawMirroredBars(canvas: Canvas, w: Float, h: Float) {
    val horizPad = 20f * density
    val availW = max(20f, w - horizPad * 2f)
    val slotW = availW / BANDS.toFloat()
    val barW = max(2.2f * density, min(slotW * 0.56f, 6.5f * density))
    val radius = barW * 0.5f
    val minBarH = 3.0f * density
    val maxBarH = max(minBarH + 2f, h - 6f * density)
    val bottomY = h - 2f * density

    // Symmetric mirrored spectrum: bass in center (indices 0..15 mirrored), treble toward edges
    val half = BANDS / 2
    for (pos in 0 until BANDS) {
      val distFromCenter = if (pos < half) (half - 1 - pos) else (pos - half)
      val bandIdx = min(BANDS - 1, distFromCenter * 2)
      val energy = (displayBands[bandIdx] * barEdgeTaper[pos]).coerceIn(0f, 1f)
      val barH = minBarH + energy * (maxBarH - minBarH)
      val cx = horizPad + slotW * (pos + 0.5f)
      barRect.set(cx - barW * 0.5f, bottomY - barH, cx + barW * 0.5f, bottomY)
      canvas.drawRoundRect(barRect, radius, radius, barPaint)
    }
  }

  private fun drawRibbons(canvas: Canvas, w: Float, h: Float) {
    val pointCount = BANDS + 2
    val baseY = h
    val layerOffsets = intArrayOf(8, 4, 0)
    val layerAmps = floatArrayOf(0.82f, 0.90f, 1.0f)

    for (layer in 0 until LAYER_COUNT) {
      val path = ribbonPaths[layer]
      path.reset()
      if (layer == LAYER_COUNT - 1) crestPath.reset()

      val ampScale = layerAmps[layer]
      val idxShift = layerOffsets[layer]
      pointX[0] = 0f
      pointY[0] = baseY - 2f * density
      for (i in 0 until BANDS) {
        val mirroredIdx = if (i < BANDS / 2) (BANDS / 2 - 1 - i) else (i - BANDS / 2)
        val bandIdx = (mirroredIdx * 2 + idxShift) % BANDS
        val x = (w * (i + 1)) / (BANDS + 1).toFloat()
        val env = (displayBands[bandIdx] * barEdgeTaper[i] * ampScale).coerceIn(0f, 1f)
        val y = baseY - (2.5f * density + env * (h - 6f * density))
        pointX[i + 1] = x
        pointY[i + 1] = y
      }
      pointX[pointCount - 1] = w
      pointY[pointCount - 1] = baseY - 2f * density

      path.moveTo(0f, baseY)
      path.lineTo(pointX[0], pointY[0])
      if (layer == LAYER_COUNT - 1) {
        crestPath.moveTo(pointX[0], pointY[0])
      }
      for (i in 0 until pointCount - 1) {
        val midX = (pointX[i] + pointX[i + 1]) * 0.5f
        val y0 = pointY[i]
        val x1 = pointX[i + 1]
        val y1 = pointY[i + 1]
        path.cubicTo(midX, y0, midX, y1, x1, y1)
        if (layer == LAYER_COUNT - 1) {
          crestPath.cubicTo(midX, y0, midX, y1, x1, y1)
        }
      }
      path.lineTo(w, baseY)
      path.close()

      canvas.drawPath(path, ribbonPaints[layer])
      if (layer == LAYER_COUNT - 1) {
        canvas.drawPath(crestPath, crestPaint)
      }
    }
  }
}
