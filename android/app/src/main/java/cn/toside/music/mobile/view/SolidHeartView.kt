package cn.toside.music.mobile.view

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import kotlin.math.min

class SolidHeartView(context: Context) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.FILL
    color = 0xFF4DAF7C.toInt()
  }
  private val unitPath = Path().apply {
    moveTo(12f, 21.35f)
    lineTo(10.55f, 20.03f)
    cubicTo(5.4f, 15.36f, 2f, 12.28f, 2f, 8.5f)
    cubicTo(2f, 5.42f, 4.42f, 3f, 7.5f, 3f)
    cubicTo(9.24f, 3f, 10.91f, 3.81f, 12f, 5.09f)
    cubicTo(13.09f, 3.81f, 14.76f, 3f, 16.5f, 3f)
    cubicTo(19.58f, 3f, 22f, 5.42f, 22f, 8.5f)
    cubicTo(22f, 12.28f, 18.6f, 15.36f, 13.45f, 20.04f)
    close()
  }
  private val scaledPath = Path()
  private val matrix = Matrix()
  private var cachedW = -1
  private var cachedH = -1

  fun setHeartColor(color: Int) {
    if (paint.color != color) {
      paint.color = color
      invalidate()
    }
  }

  private fun ensurePath(w: Int, h: Int) {
    if (cachedW == w && cachedH == h) return
    cachedW = w
    cachedH = h
    val side = min(w, h).toFloat()
    val scale = side / 24f
    val dx = (w - side) * 0.5f
    val dy = (h - side) * 0.5f
    matrix.reset()
    matrix.setScale(scale, scale)
    matrix.postTranslate(dx, dy)
    unitPath.transform(matrix, scaledPath)
  }

  override fun onDraw(canvas: Canvas) {
    val w = width
    val h = height
    if (w <= 0 || h <= 0) return
    ensurePath(w, h)
    canvas.drawPath(scaledPath, paint)
  }
}
