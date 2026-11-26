package cn.toside.music.mobile.artwork

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Color
import androidx.core.graphics.ColorUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

data class CoverPaletteResult(
  val isNeutral: Boolean,
  val seedRgb: String?,
  val colors: Array<String>,
) {
  fun toWritableMap(): WritableMap = Arguments.createMap().apply {
    putBoolean("isNeutral", isNeutral)
    if (seedRgb == null) {
      putNull("seedRgb")
    } else {
      putString("seedRgb", seedRgb)
    }
    val arr = Arguments.createArray()
    for (c in colors) {
      arr.pushString(c)
    }
    putArray("colors", arr)
  }

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (other !is CoverPaletteResult) return false
    return isNeutral == other.isNeutral && seedRgb == other.seedRgb && colors.contentEquals(other.colors)
  }

  override fun hashCode(): Int {
    var result = isNeutral.hashCode()
    result = 31 * result + (seedRgb?.hashCode() ?: 0)
    result = 31 * result + colors.contentHashCode()
    return result
  }
}

object CoverPaletteExtractor {
  private const val BUCKETS = 24
  private const val DEG_TO_RAD = PI / 180.0

  fun emptyNeutral(): CoverPaletteResult = CoverPaletteResult(true, null, emptyArray())

  fun analyze(bmp: Bitmap): CoverPaletteResult {
    val w = bmp.width
    val h = bmp.height
    if (w <= 0 || h <= 0) return emptyNeutral()

    val stepX = max(1, w / 32)
    val stepY = max(1, h / 32)

    val bucketWeight = FloatArray(BUCKETS)
    val bucketSinH = FloatArray(BUCKETS)
    val bucketCosH = FloatArray(BUCKETS)
    val bucketS = FloatArray(BUCKETS)
    val bucketL = FloatArray(BUCKETS)
    var totalChromaticWeight = 0f
    var sampledPixels = 0
    val hsl = FloatArray(3)

    var y = 0
    while (y < h) {
      var x = 0
      while (x < w) {
        val pixel = bmp.getPixel(x, y)
        if (Color.alpha(pixel) >= 128) {
          sampledPixels++
          ColorUtils.RGBToHSL(Color.red(pixel), Color.green(pixel), Color.blue(pixel), hsl)
          val hue = hsl[0]
          val sat = hsl[1]
          val lum = hsl[2]
          if (sat >= 0.12f && lum >= 0.08f && lum <= 0.92f) {
            val lumPenalty = max(0.15f, 1.0f - abs(lum - 0.52f) * 1.35f)
            val weight = (0.30f + sat * 0.70f) * lumPenalty
            val idx = (hue / 15.0f).toInt().coerceIn(0, BUCKETS - 1)
            val rad = hue * DEG_TO_RAD
            bucketWeight[idx] += weight
            bucketSinH[idx] += sin(rad).toFloat() * weight
            bucketCosH[idx] += cos(rad).toFloat() * weight
            bucketS[idx] += sat * weight
            bucketL[idx] += lum * weight
            totalChromaticWeight += weight
          }
        }
        x += stepX
      }
      y += stepY
    }

    if (sampledPixels == 0 || totalChromaticWeight < max(1.8f, sampledPixels * 0.035f)) {
      return emptyNeutral()
    }

    var primaryIdx = 0
    var bestWeight = -1f
    for (i in 0 until BUCKETS) {
      val prev = (i + BUCKETS - 1) % BUCKETS
      val next = (i + 1) % BUCKETS
      val smoothed = bucketWeight[i] + 0.35f * (bucketWeight[prev] + bucketWeight[next])
      if (smoothed > bestWeight && bucketWeight[i] > 0f) {
        bestWeight = smoothed
        primaryIdx = i
      }
    }

    val w1 = bucketWeight[primaryIdx]
    var h1 = Math.toDegrees(atan2(bucketSinH[primaryIdx].toDouble(), bucketCosH[primaryIdx].toDouble())).toFloat()
    if (h1 < 0f) h1 += 360f
    val s1 = (bucketS[primaryIdx] / w1).coerceIn(0.42f, 0.82f)
    val l1 = (bucketL[primaryIdx] / w1).coerceIn(0.44f, 0.58f)

    var secondaryIdx = -1
    var secondBest = 0f
    for (i in 0 until BUCKETS) {
      var dist = abs(i - primaryIdx)
      dist = min(dist, BUCKETS - dist)
      if (dist >= 2 && bucketWeight[i] > secondBest) {
        secondBest = bucketWeight[i]
        secondaryIdx = i
      }
    }

    val h2: Float
    val s2: Float
    val l2: Float
    if (secondaryIdx >= 0 && secondBest >= w1 * 0.16f) {
      val w2 = bucketWeight[secondaryIdx]
      var rawH2 = Math.toDegrees(atan2(bucketSinH[secondaryIdx].toDouble(), bucketCosH[secondaryIdx].toDouble())).toFloat()
      if (rawH2 < 0f) rawH2 += 360f
      h2 = rawH2
      s2 = (bucketS[secondaryIdx] / w2).coerceIn(0.38f, 0.78f)
      l2 = (bucketL[secondaryIdx] / w2).coerceIn(0.40f, 0.56f)
    } else {
      h2 = (h1 + 36f) % 360f
      s2 = (s1 * 0.90f).coerceIn(0.36f, 0.74f)
      l2 = (l1 * 0.94f).coerceIn(0.38f, 0.54f)
    }

    val h3 = (h1 + 324f) % 360f
    val s3 = (s1 * 0.86f).coerceIn(0.34f, 0.72f)
    val l3 = (l1 * 1.06f).coerceIn(0.42f, 0.62f)

    val h4 = (h2 + 24f) % 360f
    val s4 = (s2 * 0.78f).coerceIn(0.30f, 0.66f)
    val l4 = (l2 * 0.84f).coerceIn(0.32f, 0.48f)

    val seedColor = ColorUtils.HSLToColor(floatArrayOf(h1, s1, l1))
    @SuppressLint("DefaultLocale")
    val seedRgb = String.format("rgb(%d, %d, %d)", Color.red(seedColor), Color.green(seedColor), Color.blue(seedColor))

    val colors = arrayOf(
      toHexColor(ColorUtils.HSLToColor(floatArrayOf(h1, s1, l1))),
      toHexColor(ColorUtils.HSLToColor(floatArrayOf(h2, s2, l2))),
      toHexColor(ColorUtils.HSLToColor(floatArrayOf(h3, s3, l3))),
      toHexColor(ColorUtils.HSLToColor(floatArrayOf(h4, s4, l4))),
    )

    return CoverPaletteResult(false, seedRgb, colors)
  }

  @SuppressLint("DefaultLocale")
  private fun toHexColor(color: Int): String =
    String.format("#%02X%02X%02X", Color.red(color), Color.green(color), Color.blue(color))
}
