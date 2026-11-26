package cn.toside.music.mobile.lyric

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Point
import android.hardware.SensorManager
import android.hardware.input.InputManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.OrientationEventListener
import android.view.View
import android.view.WindowManager
import cn.toside.music.mobile.R
import cn.toside.music.mobile.core.sendJsEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import java.util.regex.Pattern
import kotlin.math.abs
import kotlin.math.min

class LyricView(
  private val reactContext: ReactApplicationContext,
) : View.OnTouchListener {

  companion object {
    private const val EVENT_SET_POSITION = "set-position"
    private val COLOR_RGBA_PATTERN = Pattern.compile("rgba? *\\( *(\\d+), *(\\d+), *(\\d+)(?:, *([\\d.]+))? *\\)")

    @JvmStatic
    fun parseColor(input: String): Int {
      if (input.startsWith("#")) return Color.parseColor(input)
      val m = COLOR_RGBA_PATTERN.matcher(input)
      if (m.matches()) {
        val red = m.group(1)?.toInt() ?: 0
        val green = m.group(2)?.toInt() ?: 0
        val blue = m.group(3)?.toInt() ?: 0
        val alpha = m.group(4)?.toFloatOrNull() ?: 1f
        return Color.argb((alpha * 255).toInt(), red, green, blue)
      }
      return Color.parseColor("#000000")
    }
  }

  private var textView: LyricSwitchView? = null
  private var windowManager: WindowManager? = null
  private var layoutParams: WindowManager.LayoutParams? = null

  private var lastX: Float = 0f
  private var lastY: Float = 0f
  private var prevViewPercentageX: Float = 0f
  private var prevViewPercentageY: Float = 0f
  private var widthPercentage: Float = 1f

  private var isLock: Boolean = false
  private var isSingleLine: Boolean = false
  private var isShowToggleAnima: Boolean = false
  private var unplayColor: String = "rgba(255, 255, 255, 1)"
  private var playedColor: String = "rgba(7, 197, 86, 1)"
  private var shadowColor: String = "rgba(0, 0, 0, 0.15)"
  private var textX: String = "LEFT"
  private var textY: String = "TOP"
  private var alpha: Float = 1f
  private var textSize: Float = 18f
  private var maxWidth: Int = 0
  private var maxHeight: Int = 0
  private var maxLineNum: Int = 5

  private var currentLyric: String = "Xmusic ^-^"
  private var currentExtendedLyrics: List<String> = emptyList()

  private var mLastRotation: Int = 0
  private var orientationEventListener: OrientationEventListener? = null
  private val fixViewPositionHandler = Handler(Looper.getMainLooper())
  private val fixViewPositionRunnable = Runnable { updateViewPosition() }

  private fun listenOrientationEvent() {
    if (orientationEventListener == null) {
      orientationEventListener = object : OrientationEventListener(reactContext, SensorManager.SENSOR_DELAY_NORMAL) {
        override fun onOrientationChanged(orientation: Int) {
          val wm = windowManager ?: return
          @Suppress("DEPRECATION")
          val rotation = wm.defaultDisplay.rotation
          if (rotation != mLastRotation) {
            fixViewPositionHandler.postDelayed(fixViewPositionRunnable, 300L)
          }
          mLastRotation = rotation
        }
      }
    }
    if (orientationEventListener?.canDetectOrientation() == true) {
      orientationEventListener?.enable()
    }
  }

  private fun removeOrientationEvent() {
    orientationEventListener?.disable()
  }

  private fun getLayoutParamsFlags(): Int {
    var flag = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
      WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
      WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
    if (isLock) {
      flag = flag or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
    }
    return flag
  }

  @Suppress("DEPRECATION")
  private fun updateWH(): Boolean {
    val wm = windowManager ?: return false
    val display = wm.defaultDisplay
    val size = Point()
    display.getRealSize(size)
    if (maxWidth == size.x && maxHeight == size.y) return false
    maxWidth = size.x
    maxHeight = size.y
    return true
  }

  private fun setLayoutParamsHeight() {
    val tv = textView ?: return
    val lp = layoutParams ?: return
    val paint = tv.getPaint() ?: return
    var height = paint.getFontMetricsInt(null) * maxLineNum
    if (height > maxHeight - 100) height = maxHeight - 100
    lp.height = height
    tv.setHeight(height)
  }

  private fun fixViewPosition() {
    val lp = layoutParams ?: return
    val maxX = maxWidth - lp.width
    var x = (maxWidth * prevViewPercentageX).toInt()
    if (x < 0) x = 0 else if (x > maxX) x = maxX
    if (lp.x != x) lp.x = x

    setLayoutParamsHeight()

    val maxY = maxHeight - lp.height
    var y = (maxHeight * prevViewPercentageY).toInt()
    if (y < 0) y = 0 else if (y > maxY) y = maxY
    if (lp.y != y) lp.y = y
  }

  private fun updateViewPosition() {
    if (!updateWH()) return
    val lp = layoutParams ?: return
    val wm = windowManager ?: return
    val tv = textView ?: return

    val width = (maxWidth * widthPercentage).toInt()
    if (lp.width != width) {
      lp.width = width
      tv.setWidth(width)
    }
    fixViewPosition()
    wm.updateViewLayout(tv, lp)
  }

  private fun sendPositionEvent(x: Float, y: Float) {
    val params = Arguments.createMap().apply {
      putDouble("x", x.toDouble())
      putDouble("y", y.toDouble())
    }
    reactContext.sendJsEvent(EVENT_SET_POSITION, params)
  }

  fun showLyricView(options: Bundle) {
    isLock = options.getBoolean("isLock", isLock)
    isSingleLine = options.getBoolean("isSingleLine", isSingleLine)
    isShowToggleAnima = options.getBoolean("isShowToggleAnima", isShowToggleAnima)
    unplayColor = options.getString("unplayColor", unplayColor)
    playedColor = options.getString("playedColor", playedColor)
    shadowColor = options.getString("shadowColor", shadowColor)
    prevViewPercentageX = options.getDouble("lyricViewX", 0.0).toFloat() / 100f
    prevViewPercentageY = options.getDouble("lyricViewY", 0.0).toFloat() / 100f
    textX = options.getString("textX", textX)
    textY = options.getString("textY", textY)
    alpha = options.getDouble("alpha", alpha.toDouble()).toFloat()
    textSize = options.getDouble("textSize", textSize.toDouble()).toFloat()
    widthPercentage = options.getDouble("width", 100.0).toFloat() / 100f
    maxLineNum = options.getDouble("maxLineNum", maxLineNum.toDouble()).toInt()
    handleShowLyric()
    listenOrientationEvent()
  }

  @SuppressLint("ClickableViewAccessibility")
  private fun createTextView(): LyricSwitchView {
    val tv = LyricSwitchView(reactContext, isSingleLine, isShowToggleAnima).apply {
      setText("")
      setText(currentLyric)
      setTextColor(parseColor(playedColor))
      setShadowColor(parseColor(shadowColor))
      alpha = this@LyricView.alpha
      setTextSize(this@LyricView.textSize)
      setOnTouchListener(this@LyricView)
      setGravity(resolveGravity(textX, textY))
      if (!isSingleLine) setMaxLines(maxLineNum)
    }
    textView = tv
    return tv
  }

  private fun resolveGravity(gx: String, gy: String): Int {
    val horiz = when (gx) {
      "CENTER" -> Gravity.CENTER_HORIZONTAL
      "RIGHT" -> Gravity.END
      else -> Gravity.START
    }
    val vert = when (gy) {
      "CENTER" -> Gravity.CENTER_VERTICAL
      "BOTTOM" -> Gravity.BOTTOM
      else -> Gravity.TOP
    }
    return horiz or vert
  }

  private fun handleShowLyric() {
    val wm = windowManager ?: (reactContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager).also {
      windowManager = it
      layoutParams = WindowManager.LayoutParams()
    }
    val lp = layoutParams ?: WindowManager.LayoutParams().also { layoutParams = it }

    textView?.let { old ->
      try { wm.removeView(old) } catch (_: Exception) {}
    }

    val tv = createTextView()
    @Suppress("DEPRECATION")
    lp.type = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
    } else {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    }
    lp.flags = getLayoutParamsFlags()

    if (isLock) {
      tv.setBackgroundColor(Color.TRANSPARENT)
      applyAndroid12LockAlpha(lp, tv)
    } else {
      tv.setBackgroundResource(R.drawable.rounded_corner)
      tv.alpha = alpha
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        lp.alpha = 1.0f
      }
    }

    lp.gravity = Gravity.TOP or Gravity.START
    updateWH()

    lp.width = (maxWidth * widthPercentage).toInt()
    tv.setWidth(lp.width)
    setLayoutParamsHeight()

    lp.x = (maxWidth * prevViewPercentageX).toInt()
    lp.y = (maxHeight * prevViewPercentageY).toInt()
    fixViewPosition()
    lp.format = PixelFormat.TRANSPARENT

    wm.addView(tv, lp)
  }

  private fun applyAndroid12LockAlpha(lp: WindowManager.LayoutParams, tv: LyricSwitchView) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val im = reactContext.getSystemService(Context.INPUT_SERVICE) as? InputManager
      val maxObscuring = im?.maximumObscuringOpacityForTouch ?: 0.8f
      lp.alpha = min(alpha, maxObscuring * 0.94f)
      tv.alpha = 1.0f
    }
  }

  fun setLyric(text: String, extendedLyrics: List<String>) {
    if (text.isEmpty() && currentLyric.isEmpty() && extendedLyrics.isEmpty()) return
    currentLyric = text
    currentExtendedLyrics = extendedLyrics
    val tv = textView ?: return
    val displayText = if (extendedLyrics.isNotEmpty() && maxLineNum > 1 && !isSingleLine) {
      var remaining = maxLineNum - 1
      val sb = StringBuilder(text)
      for (lrc in extendedLyrics) {
        sb.append('\n').append(lrc)
        if (--remaining < 1) break
      }
      sb.toString()
    } else {
      text
    }
    tv.setText(displayText)
  }

  fun setMaxLineNum(maxLineNum: Int) {
    this.maxLineNum = maxLineNum
    val tv = textView ?: return
    val lp = layoutParams ?: return
    val wm = windowManager ?: return
    if (!isSingleLine) tv.setMaxLines(maxLineNum)
    setLayoutParamsHeight()
    val maxY = maxHeight - lp.height
    var y = lp.y
    if (y < 0) y = 0 else if (y > maxY) y = maxY
    if (lp.y != y) lp.y = y
    wm.updateViewLayout(tv, lp)
  }

  fun setWidth(width: Int) {
    val tv = textView ?: return
    val lp = layoutParams ?: return
    val wm = windowManager ?: return
    widthPercentage = width / 100f
    lp.width = (maxWidth * widthPercentage).toInt()
    tv.setWidth(lp.width)
    val maxX = maxWidth - lp.width
    var x = lp.x
    if (x < 0) x = 0 else if (x > maxX) x = maxX
    if (lp.x != x) lp.x = x
    wm.updateViewLayout(tv, lp)
  }

  fun setPosition(xPercent: Float, yPercent: Float) {
    prevViewPercentageX = xPercent / 100f
    prevViewPercentageY = yPercent / 100f
    val tv = textView ?: return
    val lp = layoutParams ?: return
    val wm = windowManager ?: return
    fixViewPosition()
    wm.updateViewLayout(tv, lp)
  }

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouch(v: View, event: MotionEvent): Boolean {
    val lp = layoutParams ?: return true
    val wm = windowManager ?: return true
    val tv = textView ?: return true
    val maxX = maxWidth - lp.width
    val maxY = maxHeight - lp.height

    when (event.action) {
      MotionEvent.ACTION_DOWN -> {
        lastX = event.rawX
        lastY = event.rawY
      }
      MotionEvent.ACTION_MOVE -> {
        val nowX = event.rawX
        val nowY = event.rawY
        val tranX = nowX - lastX
        val tranY = nowY - lastY
        var x = lp.x + tranX.toInt()
        if (x < 0) x = 0 else if (x > maxX) x = maxX
        var y = lp.y + tranY.toInt()
        if (y < 0) y = 0 else if (y > maxY) y = maxY
        lp.x = x
        lp.y = y
        wm.updateViewLayout(tv, lp)
        lastX = nowX
        lastY = nowY
      }
      MotionEvent.ACTION_UP -> {
        val ratioX = if (maxWidth > 0) lp.x.toFloat() / maxWidth.toFloat() else 0f
        val ratioY = if (maxHeight > 0) lp.y.toFloat() / maxHeight.toFloat() else 0f
        if (abs(ratioX - prevViewPercentageX) > 0.0005f || abs(ratioY - prevViewPercentageY) > 0.0005f) {
          prevViewPercentageX = ratioX
          prevViewPercentageY = ratioY
          sendPositionEvent(ratioX * 100f, ratioY * 100f)
        }
      }
    }
    return true
  }

  fun lockView() {
    isLock = true
    val wm = windowManager ?: return
    val tv = textView ?: return
    val lp = layoutParams ?: return
    lp.flags = getLayoutParamsFlags()
    applyAndroid12LockAlpha(lp, tv)
    tv.setBackgroundColor(Color.TRANSPARENT)
    wm.updateViewLayout(tv, lp)
  }

  fun unlockView() {
    isLock = false
    val wm = windowManager ?: return
    val tv = textView ?: return
    val lp = layoutParams ?: return
    lp.flags = getLayoutParamsFlags()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      lp.alpha = 1.0f
    }
    tv.alpha = alpha
    tv.setBackgroundResource(R.drawable.rounded_corner)
    wm.updateViewLayout(tv, lp)
  }

  fun setColor(unplayColor: String, playedColor: String, shadowColor: String) {
    this.unplayColor = unplayColor
    this.playedColor = playedColor
    this.shadowColor = shadowColor
    val tv = textView ?: return
    tv.setTextColor(parseColor(playedColor))
    tv.setShadowColor(parseColor(shadowColor))
  }

  fun setLyricTextPosition(textX: String, textY: String) {
    this.textX = textX
    this.textY = textY
    val wm = windowManager ?: return
    val tv = textView ?: return
    val lp = layoutParams ?: return
    tv.setGravity(resolveGravity(textX, textY))
    wm.updateViewLayout(tv, lp)
  }

  fun setAlpha(alpha: Float) {
    this.alpha = alpha
    val tv = textView ?: return
    val lp = layoutParams
    val wm = windowManager
    if (isLock && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && wm != null && lp != null) {
      applyAndroid12LockAlpha(lp, tv)
      wm.updateViewLayout(tv, lp)
    } else {
      tv.alpha = alpha
    }
  }

  fun setSingleLine(isSingleLine: Boolean) {
    this.isSingleLine = isSingleLine
    val oldTv = textView ?: return
    val wm = windowManager ?: return
    val lp = layoutParams ?: return
    try { wm.removeView(oldTv) } catch (_: Exception) {}
    val newTv = createTextView()
    newTv.setWidth(lp.width)
    newTv.setHeight(lp.height)
    wm.addView(newTv, lp)
    if (isLock) lockView() else unlockView()
    setLyric(currentLyric, currentExtendedLyrics)
  }

  fun setShowToggleAnima(showToggleAnima: Boolean) {
    isShowToggleAnima = showToggleAnima
    textView?.setShowAnima(showToggleAnima)
  }

  fun setTextSize(size: Float) {
    this.textSize = size
    val wm = windowManager ?: return
    val tv = textView ?: return
    val lp = layoutParams ?: return
    tv.setTextSize(size)
    setLayoutParamsHeight()
    wm.updateViewLayout(tv, lp)
  }

  fun destroyView() {
    fixViewPositionHandler.removeCallbacks(fixViewPositionRunnable)
    val tv = textView
    val wm = windowManager
    if (tv != null && wm != null) {
      try {
        wm.removeView(tv)
      } catch (e: Exception) {
        Log.w("LyricView", "removeView failed", e)
      }
    }
    textView = null
    removeOrientationEvent()
  }

  fun destroy() {
    destroyView()
    windowManager = null
    layoutParams = null
  }
}
