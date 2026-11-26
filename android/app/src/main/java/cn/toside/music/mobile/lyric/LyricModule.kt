package cn.toside.music.mobile.lyric

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class LyricModule(
  private val reactAppContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactAppContext) {

  private var lyric: Lyric? = null
  private var isShowTranslation: Boolean = false
  private var isShowRoma: Boolean = false
  private var playbackRate: Float = 1f
  private var listenerCount: Int = 0

  override fun getName(): String = "LyricModule"

  override fun invalidate() {
    lyric?.destroy()
    lyric = null
    super.invalidate()
  }

  private fun ensureLyric(): Lyric =
    lyric ?: Lyric(reactAppContext, isShowTranslation, isShowRoma, playbackRate).also { lyric = it }

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
  fun showDesktopLyric(data: ReadableMap, promise: Promise) {
    val bundle: Bundle = Arguments.toBundle(data) ?: Bundle()
    ensureLyric().showDesktopLyric(bundle, promise)
  }

  @ReactMethod
  fun hideDesktopLyric(promise: Promise) {
    lyric?.hideDesktopLyric()
    promise.resolve(null)
  }

  @ReactMethod
  fun setSendLyricTextEvent(isSend: Boolean, promise: Promise) {
    ensureLyric().setSendLyricTextEvent(isSend)
    promise.resolve(null)
  }

  @ReactMethod
  fun setLyric(lyricText: String?, translation: String?, romaLyric: String?, promise: Promise) {
    lyric?.setLyric(lyricText, translation, romaLyric)
    promise.resolve(null)
  }

  @ReactMethod
  fun setPlaybackRate(playbackRate: Float, promise: Promise) {
    this.playbackRate = playbackRate
    lyric?.setPlaybackRate(playbackRate)
    promise.resolve(null)
  }

  @ReactMethod
  fun toggleTranslation(isShowTranslation: Boolean, promise: Promise) {
    this.isShowTranslation = isShowTranslation
    lyric?.toggleTranslation(isShowTranslation)
    promise.resolve(null)
  }

  @ReactMethod
  fun toggleRoma(isShowRoma: Boolean, promise: Promise) {
    this.isShowRoma = isShowRoma
    lyric?.toggleRoma(isShowRoma)
    promise.resolve(null)
  }

  @ReactMethod
  fun play(time: Int, promise: Promise) {
    Log.d("Lyric", "play lyric: $time")
    lyric?.play(time)
    promise.resolve(null)
  }

  @ReactMethod
  fun pause(promise: Promise) {
    Log.d("Lyric", "play pause")
    lyric?.pauseLyric()
    promise.resolve(null)
  }

  @ReactMethod
  fun toggleLock(isLock: Boolean, promise: Promise) {
    if (isLock) lyric?.lockLyric() else lyric?.unlockLyric()
    promise.resolve(null)
  }

  @ReactMethod
  fun setColor(unplayColor: String, playedColor: String, shadowColor: String, promise: Promise) {
    lyric?.setPlayedColor(unplayColor, playedColor, shadowColor)
    promise.resolve(null)
  }

  @ReactMethod
  fun setAlpha(alpha: Float, promise: Promise) {
    lyric?.setAlpha(alpha)
    promise.resolve(null)
  }

  @ReactMethod
  fun setTextSize(size: Float, promise: Promise) {
    lyric?.setTextSize(size)
    promise.resolve(null)
  }

  @ReactMethod
  fun setMaxLineNum(maxLineNum: Int, promise: Promise) {
    lyric?.setMaxLineNum(maxLineNum)
    promise.resolve(null)
  }

  @ReactMethod
  fun setSingleLine(singleLine: Boolean, promise: Promise) {
    lyric?.setSingleLine(singleLine)
    promise.resolve(null)
  }

  @ReactMethod
  fun setShowToggleAnima(showToggleAnima: Boolean, promise: Promise) {
    lyric?.setShowToggleAnima(showToggleAnima)
    promise.resolve(null)
  }

  @ReactMethod
  fun setWidth(width: Int, promise: Promise) {
    lyric?.setWidth(width)
    promise.resolve(null)
  }

  @ReactMethod
  fun setPosition(x: Float, y: Float, promise: Promise) {
    lyric?.setPosition(x, y)
    promise.resolve(null)
  }

  @ReactMethod
  fun setLyricTextPosition(positionX: String, positionY: String, promise: Promise) {
    lyric?.setLyricTextPosition(positionX, positionY)
    promise.resolve(null)
  }

  @ReactMethod
  fun checkOverlayPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactAppContext)) {
      promise.reject(Exception("Permission denied"))
      return
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun openOverlayPermissionActivity(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactAppContext)) {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${reactAppContext.applicationContext.packageName}"),
      )
      if (reactAppContext.currentActivity != null) {
        reactAppContext.startActivityForResult(intent, 1, null)
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactAppContext.startActivity(intent)
      }
    }
    promise.resolve(null)
  }
}
