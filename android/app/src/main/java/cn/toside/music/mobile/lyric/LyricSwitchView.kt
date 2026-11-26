package cn.toside.music.mobile.lyric

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Typeface
import android.text.TextPaint
import android.text.TextUtils
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.view.animation.AnimationSet
import android.view.animation.TranslateAnimation
import android.widget.TextSwitcher
import android.widget.TextView

@SuppressLint("ViewConstructor")
class LyricSwitchView(
  context: Context,
  isSingleLine: Boolean,
  private var isShowAnima: Boolean,
) : TextSwitcher(context) {

  private val textView: TextView
  private val textView2: TextView
  private val viewArray: List<TextView>

  init {
    if (isSingleLine) {
      textView = LyricTextView(context)
      textView2 = LyricTextView(context)
    } else {
      textView = TextView(context).apply { ellipsize = TextUtils.TruncateAt.END }
      textView2 = TextView(context).apply { ellipsize = TextUtils.TruncateAt.END }
    }
    viewArray = listOf(textView, textView2)
    updateAnima()
    addView(textView)
    addView(textView2)
  }

  fun inAnim(dir: String?, height: Float): Animation? {
    val translate = when (dir) {
      "top" -> TranslateAnimation(0.0f, 0.0f, height, 0.0f)
      "bottom" -> TranslateAnimation(0.0f, 0.0f, -height, 0.0f)
      "left" -> TranslateAnimation(100.0f, 0.0f, 0.0f, 0.0f)
      "right" -> TranslateAnimation(-100.0f, 0.0f, 0.0f, 0.0f)
      else -> return null
    }
    return AnimationSet(true).apply {
      translate.duration = 300L
      addAnimation(translate)
      addAnimation(AlphaAnimation(0.0f, 1.0f).apply { duration = 300L })
    }
  }

  fun outAnim(dir: String?, height: Float): Animation? {
    val translate = when (dir) {
      "top" -> TranslateAnimation(0.0f, 0.0f, 0.0f, -height)
      "bottom" -> TranslateAnimation(0.0f, 0.0f, 0.0f, height)
      "left" -> TranslateAnimation(0.0f, -100.0f, 0.0f, 0.0f)
      "right" -> TranslateAnimation(0.0f, 100.0f, 0.0f, 0.0f)
      else -> return null
    }
    return AnimationSet(true).apply {
      translate.duration = 300L
      addAnimation(translate)
      addAnimation(AlphaAnimation(1.0f, 0.0f).apply { duration = 300L })
    }
  }

  private fun updateAnima() {
    if (isShowAnima) {
      val size = textView.textSize
      inAnimation = inAnim("top", size)
      outAnimation = outAnim("top", size)
    } else {
      inAnimation = null
      outAnimation = null
    }
  }

  fun setShowAnima(showAnima: Boolean) {
    isShowAnima = showAnima
    updateAnima()
  }

  fun getText(): CharSequence = (currentView as? TextView)?.text ?: ""

  fun getPaint(): TextPaint? = (currentView as? TextView)?.paint

  fun setWidth(px: Int) {
    for (v in viewArray) v.width = px
  }

  fun setTextColor(color: Int) {
    for (v in viewArray) v.setTextColor(color)
  }

  fun setShadowColor(color: Int) {
    for (v in viewArray) v.setShadowLayer(1.6f, 1.5f, 1.3f, color)
  }

  fun setSourceText(str: CharSequence) {
    for (v in viewArray) v.text = str
  }

  fun setLetterSpacings(letterSpacing: Float) {
    for (v in viewArray) v.letterSpacing = letterSpacing
  }

  fun setHeight(px: Int) {
    for (v in viewArray) v.height = px
  }

  fun setTypeface(typeface: Typeface?) {
    for (v in viewArray) v.typeface = typeface
  }

  fun setSingleLine(single: Boolean) {
    for (v in viewArray) v.isSingleLine = single
  }

  fun setMaxLines(lines: Int) {
    for (v in viewArray) v.maxLines = lines
  }

  fun setTextSize(size: Float) {
    for (v in viewArray) v.textSize = size
    updateAnima()
  }

  fun setGravity(gravity: Int) {
    for (v in viewArray) v.gravity = gravity
  }
}
