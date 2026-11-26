package cn.toside.music.mobile.view

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.view.View

class LinearGradientView(context: Context) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG)
  private var colors = intArrayOf(0x00000000, 0x00000000)
  private var locations: FloatArray? = null
  private var cachedHeight = -1
  private var cachedColors: IntArray? = null
  private var cachedLocations: FloatArray? = null

  fun setColors(colors: IntArray?) {
    val nextColors = if (colors == null || colors.size < 2) {
      intArrayOf(0x00000000, 0x00000000)
    } else {
      colors
    }
    if (this.colors.contentEquals(nextColors)) return
    this.colors = nextColors
    cachedHeight = -1
    invalidate()
  }

  fun setLocations(locations: FloatArray?) {
    if (this.locations.contentEquals(locations)) return
    this.locations = locations
    cachedHeight = -1
    invalidate()
  }

  private fun ensureShader(height: Int) {
    if (cachedHeight == height &&
      cachedColors.contentEquals(colors) &&
      cachedLocations.contentEquals(locations)
    ) {
      return
    }
    cachedHeight = height
    cachedColors = colors.clone()
    cachedLocations = locations?.clone()

    val locs = locations?.takeIf { it.size == colors.size }
    paint.shader = LinearGradient(0f, 0f, 0f, height.toFloat(), colors, locs, Shader.TileMode.CLAMP)
  }

  override fun onDraw(canvas: Canvas) {
    val w = width
    val h = height
    if (w <= 0 || h <= 0 || colors.size < 2) return
    ensureShader(h)
    canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), paint)
  }
}
