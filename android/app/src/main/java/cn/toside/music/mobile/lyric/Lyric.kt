package cn.toside.music.mobile.lyric

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.util.Log
import cn.toside.music.mobile.core.sendJsEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil

class Lyric(
  private val reactAppContext: ReactApplicationContext,
  private var isShowTranslation: Boolean,
  private var isShowRoma: Boolean,
  playbackRate: Float,
) : LyricPlayer() {

  companion object {
    private const val EVENT_LYRIC_LINE_PLAY = "lyric-line-play"
  }

  private var lyricView: LyricView? = null
  private var screenOnOffReceiver: BroadcastReceiver? = null

  private var isRunPlayer: Boolean = false
  private var lastLine: Int = 0
  private var isShowLyricView: Boolean = false
  private var isSendLyricTextEvent: Boolean = false
  private var isScreenOff: Boolean = false
  private var lyricText: String = ""
  private var translationText: String = ""
  private var romaLyricText: String = ""

  init {
    this.playbackRate = playbackRate
    registerScreenBroadcastReceiver()
  }

  private fun registerScreenBroadcastReceiver() {
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_ON)
      addAction(Intent.ACTION_SCREEN_OFF)
    }
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        when (intent?.action) {
          Intent.ACTION_SCREEN_OFF -> handleScreenOff()
          Intent.ACTION_SCREEN_ON -> handleScreenOn()
        }
      }
    }
    screenOnOffReceiver = receiver
    reactAppContext.registerReceiver(receiver, filter)
  }

  fun destroy() {
    pause()
    screenOnOffReceiver?.let {
      try { reactAppContext.unregisterReceiver(it) } catch (_: Exception) {}
      screenOnOffReceiver = null
    }
    UiThreadUtil.runOnUiThread {
      lyricView?.destroy()
      lyricView = null
    }
  }

  private fun isDisableAutoPause(): Boolean = !isRunPlayer || isSendLyricTextEvent

  private fun handleScreenOff() {
    isScreenOff = true
    if (isDisableAutoPause()) return
    setTempPause(true)
  }

  private fun handleScreenOn() {
    isScreenOff = false
    if (isDisableAutoPause()) return
    UiThreadUtil.runOnUiThread {
      if (lyricView == null) lyricView = LyricView(reactAppContext)
      handleGetCurrentLyric(lastLine)
      setTempPause(false)
    }
  }

  private fun pausePlayer() {
    if (!isRunPlayer || isShowLyricView || isSendLyricTextEvent) return
    isRunPlayer = false
    pause()
  }

  private fun setCurrentLyric(lyric: String, extendedLyrics: List<String>) {
    if (isShowLyricView && !isScreenOff && lyricView != null) {
      UiThreadUtil.runOnUiThread {
        lyricView?.setLyric(lyric, extendedLyrics)
      }
    }
    if (isSendLyricTextEvent) {
      val extArr = Arguments.createArray().apply {
        for (ext in extendedLyrics) pushString(ext)
      }
      val params = Arguments.createMap().apply {
        putString("text", lyric)
        putArray("extendedLyrics", extArr)
      }
      reactAppContext.sendJsEvent(EVENT_LYRIC_LINE_PLAY, params)
    }
  }

  private fun handleGetCurrentLyric(lineNum: Int) {
    lastLine = lineNum
    val current = lines.getOrNull(lineNum)
    if (current != null) {
      setCurrentLyric(current.text, current.extendedLyrics)
    } else {
      setCurrentLyric("", emptyList())
    }
  }

  fun setSendLyricTextEvent(isSend: Boolean) {
    if (isSendLyricTextEvent == isSend) return
    isSendLyricTextEvent = isSend
    if (isSend) {
      isRunPlayer = true
    } else {
      pausePlayer()
    }
  }

  fun showDesktopLyric(options: Bundle, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (isShowLyricView) {
        promise.resolve(null)
        return@runOnUiThread
      }
      val view = lyricView ?: LyricView(reactAppContext).also { lyricView = it }
      try {
        view.showLyricView(options)
        isShowLyricView = true
        isRunPlayer = true
        promise.resolve(null)
      } catch (e: Exception) {
        isShowLyricView = false
        promise.reject(e)
        Log.e("Lyric", e.message.toString())
      }
    }
  }

  fun hideDesktopLyric() {
    if (!isShowLyricView) return
    isShowLyricView = false
    pausePlayer()
    UiThreadUtil.runOnUiThread {
      lyricView?.destroy()
      lyricView = null
    }
  }

  private fun refreshLyric() {
    if (!isRunPlayer) return
    val extended = ArrayList<String>(2)
    if (isShowTranslation && translationText.isNotEmpty()) extended.add(translationText)
    if (isShowRoma && romaLyricText.isNotEmpty()) extended.add(romaLyricText)
    super.setLyric(lyricText, extended)
  }

  fun setLyric(lyric: String?, translation: String?, romaLyric: String?) {
    lyricText = lyric.orEmpty()
    translationText = translation.orEmpty()
    romaLyricText = romaLyric.orEmpty()
    refreshLyric()
  }

  override fun onSetLyric(lines: List<LyricLine>) {
    handleGetCurrentLyric(-1)
  }

  override fun onPlay(lineNum: Int) {
    handleGetCurrentLyric(lineNum)
  }

  fun pauseLyric() {
    pause()
    if (!isRunPlayer) return
    handleGetCurrentLyric(-1)
  }

  fun lockLyric() {
    UiThreadUtil.runOnUiThread { lyricView?.lockView() }
  }

  fun unlockLyric() {
    UiThreadUtil.runOnUiThread { lyricView?.unlockView() }
  }

  fun setMaxLineNum(maxLineNum: Int) {
    UiThreadUtil.runOnUiThread { lyricView?.setMaxLineNum(maxLineNum) }
  }

  fun setWidth(width: Int) {
    UiThreadUtil.runOnUiThread { lyricView?.setWidth(width) }
  }

  fun setPosition(x: Float, y: Float) {
    UiThreadUtil.runOnUiThread { lyricView?.setPosition(x, y) }
  }

  fun setSingleLine(singleLine: Boolean) {
    UiThreadUtil.runOnUiThread { lyricView?.setSingleLine(singleLine) }
  }

  fun setShowToggleAnima(showToggleAnima: Boolean) {
    UiThreadUtil.runOnUiThread { lyricView?.setShowToggleAnima(showToggleAnima) }
  }

  fun toggleTranslation(isShowTranslation: Boolean) {
    this.isShowTranslation = isShowTranslation
    refreshLyric()
  }

  fun toggleRoma(isShowRoma: Boolean) {
    this.isShowRoma = isShowRoma
    refreshLyric()
  }

  fun setPlayedColor(unplayColor: String, playedColor: String, shadowColor: String) {
    UiThreadUtil.runOnUiThread { lyricView?.setColor(unplayColor, playedColor, shadowColor) }
  }

  fun setAlpha(alpha: Float) {
    UiThreadUtil.runOnUiThread { lyricView?.setAlpha(alpha) }
  }

  fun setTextSize(size: Float) {
    UiThreadUtil.runOnUiThread { lyricView?.setTextSize(size) }
  }

  fun setLyricTextPosition(positionX: String, positionY: String) {
    UiThreadUtil.runOnUiThread { lyricView?.setLyricTextPosition(positionX, positionY) }
  }
}
