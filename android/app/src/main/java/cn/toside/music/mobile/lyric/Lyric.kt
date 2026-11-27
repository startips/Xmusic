package cn.toside.music.mobile.lyric

import cn.toside.music.mobile.core.sendJsEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext

/**
 * Native lyric line dispatcher for Bluetooth AVRCP lyrics and home-screen widgets.
 */
class Lyric(
  private val reactAppContext: ReactApplicationContext,
  private var isShowTranslation: Boolean,
  private var isShowRoma: Boolean,
  playbackRate: Float,
) : LyricPlayer() {

  companion object {
    private const val EVENT_LYRIC_LINE_PLAY = "lyric-line-play"
  }

  private var isRunPlayer: Boolean = false
  private var isSendLyricTextEvent: Boolean = false
  private var lyricText: String = ""
  private var translationText: String = ""
  private var romaLyricText: String = ""

  init {
    this.playbackRate = playbackRate
  }

  fun destroy() {
    isRunPlayer = false
    isSendLyricTextEvent = false
    pause()
  }

  private fun setCurrentLyric(lyric: String, extendedLyrics: List<String>) {
    if (!isSendLyricTextEvent) return
    val extArr = Arguments.createArray().apply {
      for (ext in extendedLyrics) pushString(ext)
    }
    val params = Arguments.createMap().apply {
      putString("text", lyric)
      putArray("extendedLyrics", extArr)
    }
    reactAppContext.sendJsEvent(EVENT_LYRIC_LINE_PLAY, params)
  }

  private fun handleGetCurrentLyric(lineNum: Int) {
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
    } else if (isRunPlayer) {
      isRunPlayer = false
      pause()
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

  fun toggleTranslation(isShowTranslation: Boolean) {
    this.isShowTranslation = isShowTranslation
    refreshLyric()
  }

  fun toggleRoma(isShowRoma: Boolean) {
    this.isShowRoma = isShowRoma
    refreshLyric()
  }
}
