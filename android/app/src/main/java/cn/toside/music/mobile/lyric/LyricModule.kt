package cn.toside.music.mobile.lyric

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

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
}
