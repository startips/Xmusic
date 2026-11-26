package cn.toside.music.mobile.utils

import android.graphics.Bitmap
import cn.toside.music.mobile.artwork.CoverArtworkRepository
import cn.toside.music.mobile.artwork.CoverPaletteExtractor
import cn.toside.music.mobile.core.ModuleCoroutineScope
import cn.toside.music.mobile.core.getStringOrNull
import cn.toside.music.mobile.widget.XmusicWidgetUpdater
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.atomic.AtomicInteger

class UtilsModule(
  private val reactAppContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactAppContext) {

  private val coroutineScope = ModuleCoroutineScope()
  private val systemUiHelper = SystemUiHelper(reactAppContext)
  private val posterShareHelper = PosterShareHelper(reactAppContext, coroutineScope.scope)
  private val deviceHelper = DevicePermissionHelper(reactAppContext, coroutineScope.scope)

  private var listenerCount: Int = 0
  @Volatile
  private var lastSyncedWidgetCoverUri: String = ""
  private val widgetCoverSeq = AtomicInteger(0)
  private val widgetCoverMutex = Mutex()

  init {
    systemUiHelper.registerListeners()
  }

  override fun getName(): String = "UtilsModule"

  override fun invalidate() {
    systemUiHelper.unregisterListeners()
    coroutineScope.cancel()
    super.invalidate()
  }

  @ReactMethod
  @Suppress("UNUSED_PARAMETER")
  fun addListener(eventName: String) {
    listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = (listenerCount - count).coerceAtLeast(0)
  }

  @ReactMethod
  fun exitApp() = deviceHelper.exitApp()

  @ReactMethod
  fun getSupportedAbis(promise: Promise) = deviceHelper.getSupportedAbis(promise)

  @ReactMethod
  fun installApk(filePath: String, fileProviderAuthority: String, promise: Promise) =
    deviceHelper.installApk(filePath, fileProviderAuthority, promise)

  @ReactMethod
  fun screenkeepAwake() = systemUiHelper.screenKeepAwake(true)

  @ReactMethod
  fun screenUnkeepAwake() = systemUiHelper.screenKeepAwake(false)

  @ReactMethod
  fun getWIFIIPV4Address(promise: Promise) = deviceHelper.getWifiIpv4Address(promise)

  @ReactMethod
  fun getDeviceName(promise: Promise) = deviceHelper.getDeviceName(promise)

  @ReactMethod
  fun isNotificationsEnabled(promise: Promise) = deviceHelper.isNotificationsEnabled(promise)

  @ReactMethod
  fun openNotificationPermissionActivity(promise: Promise) =
    deviceHelper.openNotificationPermissionActivity(promise)

  @ReactMethod
  fun shareText(shareTitle: String?, title: String?, text: String?) =
    deviceHelper.shareText(shareTitle, title, text)

  @ReactMethod
  fun performHaptic(type: String?) = systemUiHelper.performHaptic(type)

  @ReactMethod
  fun getSystemLocales(promise: Promise) = deviceHelper.getSystemLocales(promise)

  @ReactMethod
  fun getWindowSize(promise: Promise) = systemUiHelper.getWindowSize(promise)

  @ReactMethod
  fun getNavigationBarHeight(promise: Promise) = systemUiHelper.getNavigationBarHeight(promise)

  @ReactMethod
  fun getSafeAreaInsets(promise: Promise) = systemUiHelper.getSafeAreaInsets(promise)

  @ReactMethod
  fun isIgnoringBatteryOptimization(promise: Promise) =
    deviceHelper.isIgnoringBatteryOptimization(promise)

  @ReactMethod
  fun requestIgnoreBatteryOptimization(promise: Promise) =
    deviceHelper.requestIgnoreBatteryOptimization(promise)

  @ReactMethod
  fun extractCoverPalette(uri: String?, promise: Promise) {
    if (uri.isNullOrBlank()) {
      promise.resolve(CoverPaletteExtractor.emptyNeutral().toWritableMap())
      return
    }
    coroutineScope.launchMain {
      val result = CoverArtworkRepository.extractCoverPalette(reactAppContext, uri)
      promise.resolve(result.toWritableMap())
    }
  }

  @ReactMethod
  fun updateWidgetState(map: ReadableMap?) {
    if (map == null) return
    val title = map.getStringOrNull("title")
    val artist = map.getStringOrNull("artist")
    val lyric = map.getStringOrNull("lyric")
    val isPlaying = if (map.hasKey("isPlaying") && !map.isNull("isPlaying")) map.getBoolean("isPlaying") else null
    val isFavorite = if (map.hasKey("isFavorite") && !map.isNull("isFavorite")) map.getBoolean("isFavorite") else null
    val accentColor = if (map.hasKey("accentColor") && !map.isNull("accentColor")) map.getDouble("accentColor").toLong().toInt() else null
    val hasCoverKey = map.hasKey("coverUri") && !map.isNull("coverUri")
    val coverUri = if (hasCoverKey) map.getString("coverUri") else null
    val partialOnly = !hasCoverKey && title == null && artist == null && accentColor == null

    if (!hasCoverKey) {
      XmusicWidgetUpdater.saveStateAndRefresh(
        reactAppContext, title, artist, lyric, isPlaying, isFavorite, accentColor, partialOnly
      )
      return
    }

    val trimmedUri = coverUri?.trim().orEmpty()
    if (trimmedUri.isEmpty()) {
      widgetCoverSeq.incrementAndGet()
      coroutineScope.launchIO {
        widgetCoverMutex.withLock {
          lastSyncedWidgetCoverUri = ""
          deleteWidgetCoverFile()
          XmusicWidgetUpdater.invalidateCoverCache()
        }
        XmusicWidgetUpdater.saveStateAndRefresh(
          reactAppContext, title, artist, lyric, isPlaying, isFavorite, accentColor, false
        )
      }
      return
    }

    if (trimmedUri == lastSyncedWidgetCoverUri) {
      XmusicWidgetUpdater.saveStateAndRefresh(
        reactAppContext, title, artist, lyric, isPlaying, isFavorite, accentColor, false
      )
      return
    }

    val seq = widgetCoverSeq.incrementAndGet()
    coroutineScope.launchIO {
      widgetCoverMutex.withLock {
        lastSyncedWidgetCoverUri = ""
        deleteWidgetCoverFile()
        XmusicWidgetUpdater.invalidateCoverCache()
      }
      XmusicWidgetUpdater.saveStateAndRefresh(
        reactAppContext, title, artist, lyric, isPlaying, isFavorite, accentColor, false
      )
      if (seq != widgetCoverSeq.get()) return@launchIO

      var bmp: Bitmap? = null
      var shouldRecycle = false
      try {
        val loaded = CoverArtworkRepository.loadBitmapForWidget(reactAppContext, trimmedUri, 192)
        bmp = loaded.first
        shouldRecycle = loaded.second
        if (bmp != null && !bmp.isRecycled && bmp.width > 0 && bmp.height > 0 && seq == widgetCoverSeq.get()) {
          var updated = false
          widgetCoverMutex.withLock {
            if (seq == widgetCoverSeq.get()) {
              val tmp = File(reactAppContext.cacheDir, "widget_cover.tmp")
              val out = File(reactAppContext.cacheDir, "widget_cover.png")
              FileOutputStream(tmp).use { fos ->
                bmp.compress(Bitmap.CompressFormat.PNG, 92, fos)
                fos.flush()
              }
              if (out.exists()) out.delete()
              if (tmp.renameTo(out)) {
                lastSyncedWidgetCoverUri = trimmedUri
                XmusicWidgetUpdater.invalidateCoverCache()
                updated = true
              } else {
                tmp.delete()
              }
            }
          }
          if (updated) {
            XmusicWidgetUpdater.updateAllWidgets(reactAppContext)
          }
        }
      } catch (_: Exception) {
      } finally {
        if (shouldRecycle && bmp != null && !bmp.isRecycled) {
          bmp.recycle()
        }
      }
    }
  }

  private fun deleteWidgetCoverFile() {
    try {
      val out = File(reactAppContext.cacheDir, "widget_cover.png")
      if (out.exists()) out.delete()
    } catch (_: Exception) {}
  }

  @ReactMethod
  fun captureViewToPng(viewTag: Int, promise: Promise) =
    posterShareHelper.captureViewToPng(viewTag, promise)

  @ReactMethod
  fun shareImage(filePath: String?, shareTitle: String?, promise: Promise) =
    posterShareHelper.shareImage(filePath, shareTitle, promise)

  @ReactMethod
  fun saveImageToGallery(filePath: String?, displayName: String?, promise: Promise) =
    posterShareHelper.saveImageToGallery(filePath, displayName, promise)
}
