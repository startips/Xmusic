package cn.toside.music.mobile.artwork

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.bumptech.glide.Glide
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Collections
import java.util.LinkedHashMap
import kotlin.math.max

/**
 * Shared artwork loader and palette repository backed by Glide disk/memory cache
 * with an in-memory LRU palette cache, avoiding duplicate cover downloads across
 * player notifications, dynamic theme extraction, and desktop widgets.
 */
object CoverArtworkRepository {
  private const val MAX_STREAM_BYTES = 4 * 1024 * 1024
  private const val USER_AGENT =
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"

  private val paletteCache: MutableMap<String, CoverPaletteResult> = Collections.synchronizedMap(
    object : LinkedHashMap<String, CoverPaletteResult>(48, 0.75f, true) {
      override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, CoverPaletteResult>?): Boolean =
        size > 40
    }
  )

  suspend fun extractCoverPalette(context: Context, uri: String?): CoverPaletteResult {
    val key = uri?.trim().orEmpty()
    if (key.isEmpty()) return CoverPaletteExtractor.emptyNeutral()
    paletteCache[key]?.let { return it }

    return withContext(Dispatchers.IO) {
      paletteCache[key]?.let { return@withContext it }
      var bmp: Bitmap? = null
      var shouldRecycle = false
      try {
        val loaded = loadBitmapInternal(context.applicationContext, key, 64)
        bmp = loaded.first
        shouldRecycle = loaded.second
        if (bmp == null || bmp.isRecycled || bmp.width <= 0 || bmp.height <= 0) {
          CoverPaletteExtractor.emptyNeutral()
        } else {
          val computed = CoverPaletteExtractor.analyze(bmp)
          paletteCache[key] = computed
          computed
        }
      } catch (_: Exception) {
        CoverPaletteExtractor.emptyNeutral()
      } finally {
        if (shouldRecycle && bmp != null && !bmp.isRecycled) {
          bmp.recycle()
        }
      }
    }
  }

  suspend fun loadBitmapForWidget(context: Context, uri: String, targetMaxSide: Int = 192): Pair<Bitmap?, Boolean> =
    withContext(Dispatchers.IO) {
      loadBitmapInternal(context.applicationContext, uri.trim(), targetMaxSide)
    }

  /**
   * Returns (Bitmap, isOwnedByCallerAndShouldRecycle).
   * Glide-managed bitmaps belong to Glide's pool and MUST NOT be recycled manually.
   */
  private fun loadBitmapInternal(
    appContext: Context,
    uri: String,
    targetMaxSide: Int,
  ): Pair<Bitmap?, Boolean> {
    if (uri.isEmpty()) return null to false

    // Try Glide first so artwork shares memory/disk cache with XmusicMediaNotificationManager
    try {
      val glideBmp = Glide.with(appContext)
        .asBitmap()
        .load(uri)
        .override(targetMaxSide, targetMaxSide)
        .submit()
        .get()
      if (glideBmp != null && !glideBmp.isRecycled && glideBmp.width > 0 && glideBmp.height > 0) {
        return glideBmp to false
      }
    } catch (_: Exception) {
      // Fall through to direct stream decoding fallback
    }

    return decodeFallback(appContext, uri, targetMaxSide) to true
  }

  private fun decodeFallback(appContext: Context, uri: String, targetMaxSide: Int): Bitmap? {
    return try {
      val rawBytes: ByteArray? = when {
        uri.startsWith("http://") || uri.startsWith("https://") -> {
          var conn: HttpURLConnection? = null
          var isStream: InputStream? = null
          try {
            conn = (URL(uri).openConnection() as HttpURLConnection).apply {
              connectTimeout = 4500
              readTimeout = 4500
              instanceFollowRedirects = true
              setRequestProperty("User-Agent", USER_AGENT)
            }
            val code = conn.responseCode
            if (code !in 200 until 300) return null
            isStream = conn.inputStream
            readStreamCapped(isStream, MAX_STREAM_BYTES)
          } finally {
            try { isStream?.close() } catch (_: Exception) {}
            conn?.disconnect()
          }
        }
        uri.startsWith("content://") -> {
          appContext.contentResolver.openInputStream(Uri.parse(uri))?.use { stream ->
            readStreamCapped(stream, MAX_STREAM_BYTES)
          }
        }
        else -> {
          val filePath = if (uri.startsWith("file://")) Uri.parse(uri).path else uri
          if (filePath == null || !File(filePath).exists()) return null
          val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
          BitmapFactory.decodeFile(filePath, bounds)
          if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
          val decodeOpts = BitmapFactory.Options().apply {
            inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, targetMaxSide)
            inPreferredConfig = Bitmap.Config.ARGB_8888
          }
          return BitmapFactory.decodeFile(filePath, decodeOpts)
        }
      }

      if (rawBytes == null || rawBytes.isEmpty()) return null
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size, bounds)
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
      val decodeOpts = BitmapFactory.Options().apply {
        inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, targetMaxSide)
        inPreferredConfig = Bitmap.Config.ARGB_8888
      }
      BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size, decodeOpts)
    } catch (_: Exception) {
      null
    }
  }

  private fun readStreamCapped(input: InputStream, maxBytes: Int): ByteArray {
    val bos = ByteArrayOutputStream(16384)
    val buf = ByteArray(8192)
    var total = 0
    while (true) {
      val read = input.read(buf)
      if (read == -1) break
      total += read
      if (total > maxBytes) break
      bos.write(buf, 0, read)
    }
    return bos.toByteArray()
  }

  private fun computeInSampleSize(width: Int, height: Int, targetMaxSide: Int): Int {
    var inSampleSize = 1
    val maxDim = max(width, height)
    while ((maxDim / (inSampleSize * 2)) >= targetMaxSide) {
      inSampleSize *= 2
    }
    return inSampleSize
  }
}
