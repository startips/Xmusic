package cn.toside.music.mobile.utils

import android.content.ClipData
import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.UIManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class PosterShareHelper(
  private val reactContext: ReactApplicationContext,
  private val scope: CoroutineScope,
) {
  fun captureViewToPng(viewTag: Int, promise: Promise) {
    @Suppress("DEPRECATION")
    val uiManager = reactContext.getNativeModule(UIManagerModule::class.java)
    if (uiManager == null) {
      promise.reject("ERR_NO_UIMANAGER", "UIManagerModule unavailable")
      return
    }
    uiManager.addUIBlock { nativeViewHierarchyManager ->
      try {
        val view = nativeViewHierarchyManager.resolveView(viewTag)
        if (view == null || view.width <= 0 || view.height <= 0) {
          promise.reject("ERR_VIEW_EMPTY", "Target poster view is not laid out yet")
          return@addUIBlock
        }
        val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        view.draw(canvas)

        scope.launch(Dispatchers.IO) {
          try {
            val dir = File(reactContext.cacheDir, "share_posters").apply {
              if (!exists()) mkdirs()
            }
            val existing = dir.listFiles()
            if (existing != null && existing.size > 6) {
              for (i in 0 until existing.size - 4) {
                try { existing[i].delete() } catch (_: Exception) {}
              }
            }
            val outFile = File(dir, "xmusic_lyric_poster_${System.currentTimeMillis()}.png")
            FileOutputStream(outFile).use { fos ->
              bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
            }
            promise.resolve(outFile.absolutePath)
          } catch (e: Exception) {
            promise.reject("ERR_SAVE_PNG", e)
          } finally {
            if (!bitmap.isRecycled) bitmap.recycle()
          }
        }
      } catch (e: Exception) {
        promise.reject("ERR_CAPTURE", e)
      }
    }
  }

  fun shareImage(filePath: String?, shareTitle: String?, promise: Promise) {
    if (filePath.isNullOrBlank()) {
      promise.reject("ERR_PATH", "Empty file path")
      return
    }
    val file = File(filePath)
    if (!file.exists()) {
      promise.reject("ERR_NOT_FOUND", "Poster image file does not exist")
      return
    }
    try {
      val authority = "${reactContext.packageName}.provider"
      val contentUri = FileProvider.getUriForFile(reactContext, authority, file)
      val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, contentUri)
        clipData = ClipData.newRawUri("Xmusic", contentUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      val chooser = Intent.createChooser(shareIntent, shareTitle ?: "Xmusic")
      val activity = reactContext.currentActivity
      if (activity != null) {
        activity.startActivity(chooser)
      } else {
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(chooser)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERR_SHARE_IMG", e)
    }
  }

  fun saveImageToGallery(filePath: String?, displayName: String?, promise: Promise) {
    if (filePath.isNullOrBlank()) {
      promise.reject("ERR_PATH", "Invalid image path")
      return
    }
    scope.launch(Dispatchers.IO) {
      val src = File(filePath)
      if (!src.exists()) {
        promise.reject("ERR_NOT_FOUND", "Source file not found")
        return@launch
      }
      val prefix = if (!displayName.isNullOrBlank()) {
        displayName.replace(Regex("[^a-zA-Z0-9_\\-\\u4e00-\\u9fa5]"), "_")
      } else {
        "xmusic_poster"
      }
      val safeName = "${prefix}_${System.currentTimeMillis()}.png"

      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          val resolver = reactContext.contentResolver
          val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, safeName)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/Xmusic")
            put(MediaStore.Images.Media.IS_PENDING, 1)
          }
          val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
          if (uri == null) {
            promise.reject("ERR_MEDIASTORE", "Failed to create MediaStore entry")
            return@launch
          }
          FileInputStream(src).use { input ->
            resolver.openOutputStream(uri)?.use { output ->
              input.copyTo(output, bufferSize = 8192)
            } ?: throw IllegalStateException("Null OutputStream")
          }
          values.clear()
          values.put(MediaStore.Images.Media.IS_PENDING, 0)
          resolver.update(uri, values, null, null)
          promise.resolve(uri.toString())
        } else {
          @Suppress("DEPRECATION")
          val pubDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Xmusic").apply {
            if (!exists()) mkdirs()
          }
          val dest = File(pubDir, safeName)
          FileInputStream(src).use { input ->
            FileOutputStream(dest).use { output ->
              input.copyTo(output, bufferSize = 8192)
            }
          }
          MediaScannerConnection.scanFile(reactContext, arrayOf(dest.absolutePath), arrayOf("image/png"), null)
          promise.resolve(dest.absolutePath)
        }
      } catch (e: Exception) {
        promise.reject("ERR_GALLERY", e)
      }
    }
  }
}
