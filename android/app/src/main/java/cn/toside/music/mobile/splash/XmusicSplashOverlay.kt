package cn.toside.music.mobile.splash

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import cn.toside.music.mobile.R
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Coordinates the cold-start-only native splash overlay cleanly across MainActivity and JS readiness.
 */
object XmusicSplashController {
  private const val MIN_DISPLAY_MS = 650L
  private const val REDUCED_MOTION_MIN_DISPLAY_MS = 180L
  private const val MAX_TIMEOUT_MS = 2800L

  private val mainHandler = Handler(Looper.getMainLooper())
  private val hasShownInProcess = AtomicBoolean(false)

  private var splashViewRef: WeakReference<XmusicSplashView>? = null
  private var activityRef: WeakReference<Activity>? = null
  private var shownAtUptimeMs: Long = 0L
  private var hideRequested = false

  private val pendingDismissRunnable = Runnable { performFadeOut(immediate = false) }
  private val safetyTimeoutRunnable = Runnable { requestHide(immediate = false) }

  fun attachIfColdStart(activity: Activity, savedInstanceState: Bundle?) {
    if (savedInstanceState != null) return
    if (!hasShownInProcess.compareAndSet(false, true)) return

    val decor = activity.window?.decorView as? ViewGroup ?: return
    val palette = SplashThemeStore.resolve(activity)

    activity.window?.let { win ->
      WindowCompat.getInsetsController(win, decor).apply {
        isAppearanceLightStatusBars = !palette.isDark
        isAppearanceLightNavigationBars = !palette.isDark
      }
    }

    val view = XmusicSplashView(activity, palette)
    decor.addView(
      view,
      ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      ),
    )

    splashViewRef = WeakReference(view)
    activityRef = WeakReference(activity)
    shownAtUptimeMs = SystemClock.uptimeMillis()
    hideRequested = false

    mainHandler.removeCallbacks(safetyTimeoutRunnable)
    mainHandler.postDelayed(safetyTimeoutRunnable, MAX_TIMEOUT_MS)
  }

  fun requestHide(immediate: Boolean = false) {
    mainHandler.post {
      val view = splashViewRef?.get()
      if (view == null) {
        clearCallbacks()
        return@post
      }
      if (immediate) {
        clearCallbacks()
        detachNow(view)
        return@post
      }
      if (hideRequested) return@post
      hideRequested = true
      mainHandler.removeCallbacks(safetyTimeoutRunnable)

      val minDelay = if (isReducedMotion(view.context)) REDUCED_MOTION_MIN_DISPLAY_MS else MIN_DISPLAY_MS
      val elapsed = SystemClock.uptimeMillis() - shownAtUptimeMs
      val remaining = max(0L, minDelay - elapsed)
      mainHandler.removeCallbacks(pendingDismissRunnable)
      if (remaining == 0L) {
        performFadeOut(immediate = false)
      } else {
        mainHandler.postDelayed(pendingDismissRunnable, remaining)
      }
    }
  }

  fun onActivityDestroyed(activity: Activity) {
    if (activityRef?.get() === activity) {
      clearCallbacks()
      splashViewRef?.get()?.let { detachNow(it) }
      activityRef = null
    }
  }

  private fun performFadeOut(immediate: Boolean) {
    val view = splashViewRef?.get() ?: return
    val reduced = immediate || isReducedMotion(view.context)
    view.startExitTransition(reduced) {
      detachNow(view)
    }
  }

  private fun detachNow(view: View) {
    clearCallbacks()
    (view.parent as? ViewGroup)?.removeView(view)
    if (splashViewRef?.get() === view) {
      splashViewRef = null
    }
  }

  private fun clearCallbacks() {
    mainHandler.removeCallbacks(pendingDismissRunnable)
    mainHandler.removeCallbacks(safetyTimeoutRunnable)
  }

  private fun isReducedMotion(context: Context): Boolean {
    return try {
      Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    } catch (_: Exception) {
      false
    }
  }
}

/**
 * Hardware-accelerated M3E Acoustic Fluid splash view.
 */
private class XmusicSplashView(
  context: Context,
  private val palette: SplashPalette,
) : View(context) {

  companion object {
    private const val EXIT_DURATION_MS = 320f
    private const val WORDMARK_TEXT = "Xmusic"

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
            val alpha = 2 + (mag * 3.0).roundToInt()
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

    private fun withAlpha(color: Int, alphaFraction: Float): Int {
      val a = (255f * alphaFraction.coerceIn(0f, 1f)).roundToInt()
      return Color.argb(a, Color.red(color), Color.green(color), Color.blue(color))
    }

    private fun easeOutCubic(t: Float): Float {
      val inv = 1f - t.coerceIn(0f, 1f)
      return 1f - inv * inv * inv
    }

    private fun easeOutBack(t: Float): Float {
      val p = t.coerceIn(0f, 1f) - 1f
      val c1 = 1.45f
      val c3 = c1 + 1f
      return 1f + c3 * p * p * p + c1 * p * p
    }
  }

  private val density = resources.displayMetrics.density
  private val scaledDensity = resources.displayMetrics.scaledDensity

  private val bgPaint = Paint().apply { color = palette.backgroundColor }
  private val orbPaints = Array(2) { Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG) }
  private val orbShaders = arrayOfNulls<RadialGradient>(2)
  private val shaderMatrix = Matrix()
  private val noisePaint = Paint(Paint.DITHER_FLAG)

  private val ripplePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 1.5f * density
  }
  private val badgeFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.FILL
    color = withAlpha(palette.primaryColor, if (palette.isDark) 0.17f else 0.11f)
  }
  private val badgeStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = 1.0f * density
    color = withAlpha(palette.primaryColor, if (palette.isDark) 0.28f else 0.20f)
  }
  private val badgeRect = RectF()
  private val barRect = RectF()
  private val barPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.FILL
  }
  private val wordmarkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = palette.onSurfaceColor
    textSize = 26f * scaledDensity
    letterSpacing = 0.05f
    textAlign = Paint.Align.CENTER
    typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
  }

  private val emblemDrawable: Drawable? = run {
    if (!palette.isCustomSeed) {
      ContextCompat.getDrawable(context, R.drawable.ic_launcher_foreground)?.mutate()
    } else {
      ContextCompat.getDrawable(context, R.drawable.ic_launcher_monochrome)?.mutate()?.apply {
        colorFilter = PorterDuffColorFilter(palette.primaryColor, PorterDuff.Mode.SRC_IN)
      }
    }
  }

  private val startUptimeMs = SystemClock.uptimeMillis()
  private var isExiting = false
  private var exitStartMs = 0L
  private var onExitEnd: (() -> Unit)? = null
  private var exitDurationMs = EXIT_DURATION_MS

  init {
    isClickable = true
    isFocusable = true
    ensureNoiseShader()
    sNoiseShader?.let { noisePaint.shader = it }
    buildOrbShader(0, palette.primaryColor, if (palette.isDark) 0.22f else 0.16f)
    buildOrbShader(1, palette.secondaryColor, if (palette.isDark) 0.18f else 0.13f)
  }

  private fun buildOrbShader(idx: Int, baseColor: Int, peakAlpha: Float) {
    val stops = floatArrayOf(0f, 0.35f, 0.72f, 1f)
    val falloff = floatArrayOf(1f, 0.62f, 0.2f, 0f)
    val colors = IntArray(4) { s -> withAlpha(baseColor, peakAlpha * falloff[s]) }
    val grad = RadialGradient(0f, 0f, 1f, colors, stops, Shader.TileMode.CLAMP)
    orbShaders[idx] = grad
    orbPaints[idx].shader = grad
  }

  fun startExitTransition(reduced: Boolean, onEnd: () -> Unit) {
    if (isExiting) return
    isExiting = true
    onExitEnd = onEnd
    if (reduced) {
      exitDurationMs = 120f
    }
    exitStartMs = SystemClock.uptimeMillis()
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    val w = width.toFloat()
    val h = height.toFloat()
    if (w <= 0f || h <= 0f) return

    val now = SystemClock.uptimeMillis()
    val elapsedMs = (now - startUptimeMs).toFloat()
    val tSec = elapsedMs / 1000f

    var overlayAlpha = 1f
    var exitScale = 1f
    if (isExiting) {
      val ep = ((now - exitStartMs) / exitDurationMs).coerceIn(0f, 1f)
      val eased = easeOutCubic(ep)
      overlayAlpha = 1f - eased
      exitScale = 1f + 0.045f * eased
      if (ep >= 1f) {
        val cb = onExitEnd
        onExitEnd = null
        cb?.invoke()
        return
      }
    }

    val saveLayerCount = if (overlayAlpha < 0.999f) {
      canvas.saveLayerAlpha(0f, 0f, w, h, (overlayAlpha * 255f).roundToInt().coerceIn(0, 255))
    } else {
      canvas.save()
    }

    // 1. M3 surface backdrop + gentle dual-orb fluid mesh glow + IGN dithering
    canvas.drawRect(0f, 0f, w, h, bgPaint)
    val maxDim = max(w, h)
    drawOrb(
      canvas,
      0,
      w,
      h,
      w * (0.22f + 0.04f * sin(tSec * 1.15f)),
      h * (0.22f + 0.03f * sin(tSec * 0.85f + 0.7f)),
      maxDim * 0.62f,
    )
    drawOrb(
      canvas,
      1,
      w,
      h,
      w * (0.80f - 0.04f * sin(tSec * 0.95f + 1.4f)),
      h * (0.78f - 0.03f * sin(tSec * 1.05f + 2.1f)),
      maxDim * 0.66f,
    )
    if (sNoiseShader != null) {
      canvas.drawRect(0f, 0f, w, h, noisePaint)
    }

    // Center hero assembly slightly above geometric center for visual balance
    val cx = w * 0.5f
    val wordProgress = easeOutCubic(((elapsedMs - 200f) / 340f).coerceIn(0f, 1f))
    val emblemLiftPx = (-10f * density) * wordProgress
    val cy = h * 0.46f + emblemLiftPx

    canvas.save()
    canvas.scale(exitScale, exitScale, w * 0.5f, h * 0.48f)

    // 2. Two staggered soft expanding acoustic ripple rings
    val badgeSize = 88f * density
    val baseRadius = badgeSize * 0.52f
    val rippleSpan = 58f * density
    val cycleMs = 1500f
    for (rIdx in 0..1) {
      val shifted = elapsedMs - rIdx * 320f
      if (shifted > 0f) {
        val phase = (shifted % cycleMs) / cycleMs
        val radius = baseRadius + rippleSpan * phase.toDouble().pow(0.8).toFloat()
        val ringAlpha = (1f - phase) * (1f - phase) * (if (palette.isDark) 0.24f else 0.18f)
        if (ringAlpha > 0.005f) {
          ripplePaint.color = withAlpha(palette.primaryColor, ringAlpha)
          canvas.drawCircle(cx, cy, radius, ripplePaint)
        }
      }
    }

    // 3. Rounded M3 tonal badge + Xmusic emblem
    val badgeEnter = ((elapsedMs) / 340f).coerceIn(0f, 1f)
    val badgeScale = 0.92f + 0.08f * easeOutBack(badgeEnter)
    val badgeCorner = 28f * density

    canvas.save()
    canvas.scale(badgeScale, badgeScale, cx, cy)
    badgeRect.set(cx - badgeSize * 0.5f, cy - badgeSize * 0.5f, cx + badgeSize * 0.5f, cy + badgeSize * 0.5f)
    canvas.drawRoundRect(badgeRect, badgeCorner, badgeCorner, badgeFillPaint)
    canvas.drawRoundRect(badgeRect, badgeCorner, badgeCorner, badgeStrokePaint)

    emblemDrawable?.let { d ->
      val iconBox = (74f * density).roundToInt()
      val half = iconBox / 2
      d.setBounds(
        cx.roundToInt() - half,
        cy.roundToInt() - half,
        cx.roundToInt() + half,
        cy.roundToInt() + half,
      )
      d.draw(canvas)
    }
    canvas.restore()

    // 4. Wordmark fade & subtle rise below badge
    val wordAlpha = wordProgress
    if (wordAlpha > 0.01f) {
      val wordYOffset = (8f * density) * (1f - wordProgress)
      val fm = wordmarkPaint.fontMetrics
      val textCenterY = cy + badgeSize * 0.5f + 24f * density + wordYOffset - (fm.ascent + fm.descent) * 0.5f
      wordmarkPaint.alpha = (255f * wordAlpha).roundToInt().coerceIn(0, 255)
      canvas.drawText(WORDMARK_TEXT, cx, textCenterY, wordmarkPaint)
    }

    // 5. Four slender acoustic sound-bars breathing softly beneath wordmark
    val barsProgress = easeOutCubic(((elapsedMs - 280f) / 300f).coerceIn(0f, 1f))
    if (barsProgress > 0.01f) {
      val barWidth = 3.2f * density
      val barGap = 4.6f * density
      val totalWidth = 4f * barWidth + 3f * barGap
      val startX = cx - totalWidth * 0.5f
      val barsCenterY = cy + badgeSize * 0.5f + 56f * density
      val barMinH = 5.5f * density
      val barAmp = 9.5f * density
      barPaint.color = withAlpha(palette.primaryColor, 0.78f * barsProgress)

      for (b in 0 until 4) {
        val wave = 0.5f + 0.5f * sin(tSec * 4.4f - b * 0.85f)
        val barH = barMinH + barAmp * wave
        val left = startX + b * (barWidth + barGap)
        barRect.set(left, barsCenterY - barH * 0.5f, left + barWidth, barsCenterY + barH * 0.5f)
        canvas.drawRoundRect(barRect, barWidth * 0.5f, barWidth * 0.5f, barPaint)
      }
    }

    canvas.restore() // exit scale
    canvas.restoreToCount(saveLayerCount)

    postInvalidateOnAnimation()
  }

  private fun drawOrb(canvas: Canvas, idx: Int, w: Float, h: Float, cx: Float, cy: Float, radius: Float) {
    val shader = orbShaders[idx] ?: return
    if (radius <= 1f) return
    shaderMatrix.setScale(radius, radius)
    shaderMatrix.postTranslate(cx, cy)
    shader.setLocalMatrix(shaderMatrix)
    canvas.drawRect(0f, 0f, w, h, orbPaints[idx])
  }
}
