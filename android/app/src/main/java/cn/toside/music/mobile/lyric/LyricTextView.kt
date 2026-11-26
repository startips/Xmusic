package cn.toside.music.mobile.lyric

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.view.Gravity
import android.widget.TextView

@SuppressLint("AppCompatCustomView")
class LyricTextView(context: Context) : TextView(context) {
  companion object {
    const val START_SCROLL_DELAY = 1500L
    const val INVALIDATE_DELAY = 10L
    private const val SPEED_LIMIT = 0.135f
  }

  private var isStop: Boolean = true
  private var textLength: Float = 0f
  private var viewWidth: Float = 0f
  private var viewHeight: Float = 0f
  private var speed: Float = SPEED_LIMIT * textSize
  private var xx: Float = 0f
  private var gravityVertical: Int = Gravity.TOP
  private var gravityHorizontal: Int = Gravity.CENTER
  private var drawY: Float = 0f
  private var currentText: String? = null
  private val mPaint: Paint? = paint

  private val mStartScrollRunnable = Runnable { startScroll() }
  private val invalidateRunnable = Runnable { invalidate() }

  private fun initScroll() {
    xx = 0.0f
    textLength = getMeasuredTextLength()
  }

  override fun onDetachedFromWindow() {
    removeCallbacks(mStartScrollRunnable)
    removeCallbacks(invalidateRunnable)
    super.onDetachedFromWindow()
  }

  override fun onTextChanged(text: CharSequence?, start: Int, lengthBefore: Int, lengthAfter: Int) {
    super.onTextChanged(text, start, lengthBefore, lengthAfter)
    stopScroll()
    currentText = text?.toString()
    initScroll()
    postInvalidate()
    postDelayed(mStartScrollRunnable, START_SCROLL_DELAY)
  }

  override fun setTextColor(color: Int) {
    mPaint?.color = color
    postInvalidate()
  }

  override fun setShadowLayer(radius: Float, dx: Float, dy: Float, shadowColor: Int) {
    mPaint?.setShadowLayer(radius, dx, dy, shadowColor)
    post(mStartScrollRunnable)
  }

  override fun setTextSize(size: Float) {
    super.setTextSize(size)
    speed = SPEED_LIMIT * textSize
    if (currentText == null) return
    post(mStartScrollRunnable)
  }

  override fun setWidth(pixels: Int) {
    super.setWidth(pixels)
    viewWidth = pixels.toFloat()
    if (currentText == null) return
    post(mStartScrollRunnable)
  }

  override fun setHeight(pixels: Int) {
    super.setHeight(pixels)
    viewHeight = pixels.toFloat()
    drawY = computeDrawY()
    if (currentText == null) return
    post(mStartScrollRunnable)
  }

  override fun setGravity(gravity: Int) {
    var g = gravity
    if ((g and Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK) == 0) {
      g = g or Gravity.START
    }
    if ((g and Gravity.VERTICAL_GRAVITY_MASK) == 0) {
      g = g or Gravity.TOP
    }
    gravityVertical = g and Gravity.VERTICAL_GRAVITY_MASK
    gravityHorizontal = g and Gravity.RELATIVE_HORIZONTAL_GRAVITY_MASK
    drawY = computeDrawY()
    if (currentText == null) return
    post(mStartScrollRunnable)
  }

  override fun onDraw(canvas: Canvas) {
    var mSpeed = speed
    val txt = currentText
    val p = mPaint
    if (txt != null && p != null) {
      canvas.drawText(txt, computeDrawX(), drawY, p)
      if (text.length >= 20) {
        mSpeed += mSpeed
      }
    }
    if (!isStop) {
      if (viewWidth - xx + mSpeed >= textLength) {
        xx = viewWidth - textLength - 2f
        stopScroll()
      } else {
        xx -= mSpeed
      }
      invalidateAfter()
    }
  }

  private fun invalidateAfter() {
    removeCallbacks(invalidateRunnable)
    postDelayed(invalidateRunnable, INVALIDATE_DELAY)
  }

  private fun startScroll() {
    initScroll()
    isStop = false
    postInvalidate()
  }

  private fun stopScroll() {
    isStop = true
    removeCallbacks(mStartScrollRunnable)
    postInvalidate()
  }

  private fun getMeasuredTextLength(): Float {
    val p = mPaint ?: return 0.0f
    return p.measureText(currentText.orEmpty())
  }

  private fun computeDrawY(): Float {
    val p = mPaint ?: return 0f
    val fm = p.fontMetrics
    return when (gravityVertical) {
      Gravity.CENTER_VERTICAL -> viewHeight / 2f + (fm.bottom - fm.top) / 2f - fm.bottom
      Gravity.BOTTOM -> viewHeight - fm.bottom
      else -> -fm.ascent
    }
  }

  private fun computeDrawX(): Float {
    return if (textLength < viewWidth) {
      isStop = true
      when (gravityHorizontal) {
        Gravity.CENTER_HORIZONTAL -> (viewWidth - textLength) / 2f
        Gravity.END -> viewWidth - textLength
        else -> 0f
      }
    } else {
      xx
    }
  }
}
