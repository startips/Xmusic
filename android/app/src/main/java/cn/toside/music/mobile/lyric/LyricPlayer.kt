package cn.toside.music.mobile.lyric

import android.os.Handler
import android.os.Looper
import java.util.regex.Pattern

data class LyricLine(
  val time: Int,
  val text: String,
  val extendedLyrics: MutableList<String>,
)

open class LyricPlayer {
  private val timeFieldExp = "^(?:\\[[\\d:.]+])+"
  private val timeExp = "\\d{1,3}(:\\d{1,3}){0,2}(?:\\.\\d{1,3})"
  private val msTimeRxp = "\\[\\d{1,3}(:\\d{1,3}){0,2}\\.\\d{3}]"

  private val timeFieldPattern = Pattern.compile(timeFieldExp)
  private val timePattern = Pattern.compile(timeExp)
  private val msTimePattern = Pattern.compile(msTimeRxp)
  private val tagPattern = Pattern.compile("\\[(ti|ar|al|offset|by):([^\\]]*)]")

  private val timeoutHandler: Handler by lazy(LazyThreadSafetyMode.NONE) {
    Handler(Looper.getMainLooper())
  }
  private var pendingTimeoutTask: Runnable? = null

  private var lyric: String = ""
  private var extendedLyrics: List<String> = emptyList()
  protected var lines: List<LyricLine> = emptyList()
  private val tags: MutableMap<String, Any> = HashMap()

  private var isPlay: Boolean = false
  @JvmField
  protected var playbackRate: Float = 1f
  private var curLineNum: Int = 0
  private var maxLine: Int = 0
  private val offset: Int = 150
  private var performanceTime: Int = 0
  private var startPlayTime: Int = 0

  private fun startTimeout(delayMs: Long, action: () -> Unit) {
    stopTimeout()
    val task = Runnable { action() }
    pendingTimeoutTask = task
    timeoutHandler.postDelayed(task, delayMs.coerceAtLeast(0L))
  }

  private fun stopTimeout() {
    pendingTimeoutTask?.let { timeoutHandler.removeCallbacks(it) }
    pendingTimeoutTask = null
  }

  private fun getNow(): Int = (System.nanoTime() / 1_000_000L).toInt()

  private fun getCurrentTime(): Int =
    ((getNow() - performanceTime) * playbackRate).toInt() + startPlayTime

  private fun initTag() {
    tags.clear()
    val matcher = tagPattern.matcher(lyric)
    while (matcher.find()) {
      val key = matcher.group(1) ?: continue
      val value = matcher.group(2)?.trim().orEmpty()
      tags[key] = value
    }
    val offsetStr = tags["offset"] as? String
    tags["offset"] = if (offsetStr.isNullOrEmpty()) {
      0
    } else {
      offsetStr.toIntOrNull() ?: 0
    }
  }

  private val tRxp1 = Regex("^0+(\\d+)")
  private val tRxp2 = Regex(":0+(\\d+)")
  private val tRxp3 = Regex("\\.0+(\\d+)")

  private fun formatTimeLabel(label: String): String =
    label.replace(tRxp1, "$1").replace(tRxp2, ":$1").replace(tRxp3, ".$1")

  private fun parseExtendedLyric(linesMap: Map<String, LyricLine>, extendedLyric: String) {
    val extendedLyricLines = extendedLyric.split(Regex("\r\n|\n|\r"))
    for (translationLine in extendedLyricLines) {
      val line = translationLine.trim()
      val timeFieldResult = timeFieldPattern.matcher(line)
      if (timeFieldResult.find()) {
        val timeField = timeFieldResult.group()
        val text = line.replace(Regex(timeFieldExp), "").trim()
        if (text.isNotEmpty()) {
          val timeMatchResult = timePattern.matcher(timeField)
          while (timeMatchResult.find()) {
            val timeStr = formatTimeLabel(timeMatchResult.group())
            linesMap[timeStr]?.extendedLyrics?.add(text)
          }
        }
      }
    }
  }

  private fun initLines() {
    val isMsTime = msTimePattern.matcher(lyric).find()
    val linesStr = lyric.split(Regex("\r\n|\n|\r"))
    val linesMap = HashMap<String, LyricLine>()
    val timeMap = HashMap<String, Int>()
    val timeFieldRegex = Regex(timeFieldExp)

    for (lineStr in linesStr) {
      val line = lineStr.trim()
      val timeFieldResult = timeFieldPattern.matcher(line)
      if (timeFieldResult.find()) {
        val timeField = timeFieldResult.group()
        val text = line.replace(timeFieldRegex, "").trim()
        if (text.isNotEmpty()) {
          val timeMatchResult = timePattern.matcher(timeField)
          while (timeMatchResult.find()) {
            val timeStr = formatTimeLabel(timeMatchResult.group())
            val existing = linesMap[timeStr]
            if (existing != null) {
              existing.extendedLyrics.add(text)
              continue
            }
            val timeArr = timeStr.split(":")
            val hours: String
            val minutes: String
            var seconds: String
            var milliseconds = "0"
            when (timeArr.size) {
              3 -> {
                hours = timeArr[0]
                minutes = timeArr[1]
                seconds = timeArr[2]
              }
              2 -> {
                hours = "0"
                minutes = timeArr[0]
                seconds = timeArr[1]
              }
              1 -> {
                hours = "0"
                minutes = "0"
                seconds = timeArr[0]
              }
              else -> continue
            }
            if (seconds.contains(".")) {
              val secParts = seconds.split(".")
              seconds = secParts[0]
              if (secParts.size > 1) {
                var msStr = secParts[1]
                if (msStr.length > 3) msStr = msStr.substring(0, 3)
                if (!isMsTime) msStr = msStr.padEnd(3, '0')
                milliseconds = msStr
              }
            }
            val time = hours.toInt() * 60 * 60 * 1000 +
              minutes.toInt() * 60 * 1000 +
              seconds.toInt() * 1000 +
              milliseconds.toInt()
            linesMap[timeStr] = LyricLine(time, text, ArrayList(extendedLyrics.size))
            timeMap[timeStr] = time
          }
        }
      }
    }

    for (ext in extendedLyrics) {
      parseExtendedLyric(linesMap, ext)
    }

    val sortedEntries = timeMap.entries.sortedBy { it.value }
    val resultLines = ArrayList<LyricLine>(sortedEntries.size)
    for (entry in sortedEntries) {
      linesMap[entry.key]?.let { resultLines.add(it) }
    }
    lines = resultLines
    maxLine = lines.size - 1
  }

  private fun init() {
    initTag()
    initLines()
    onSetLyric(lines)
  }

  fun pause() {
    if (!isPlay) return
    isPlay = false
    stopTimeout()
    if (curLineNum == maxLine) return
    val nextLineNum = findCurLineNum(getCurrentTime())
    if (curLineNum != nextLineNum) {
      curLineNum = nextLineNum
      onPlay(curLineNum)
    }
  }

  fun play(curTime: Int) {
    if (lines.isEmpty()) return
    pause()
    isPlay = true
    val tagOffset = (tags["offset"] as? Int) ?: 0
    performanceTime = getNow() - tagOffset - offset
    startPlayTime = curTime
    curLineNum = findCurLineNum(getCurrentTime()) - 1
    refresh()
  }

  private fun findCurLineNum(curTime: Int, startIndex: Int = 0): Int {
    if (curTime <= 0) return 0
    val length = lines.size
    for (index in startIndex until length) {
      if (curTime < lines[index].time) {
        return if (index == 0) 0 else index - 1
      }
    }
    return length - 1
  }

  private fun handleMaxLine() {
    onPlay(curLineNum)
    pause()
  }

  private fun refresh() {
    curLineNum++

    if (curLineNum >= maxLine) {
      handleMaxLine()
      return
    }
    val curLine = lines[curLineNum]
    val currentTime = getCurrentTime()
    val driftTime = currentTime - curLine.time

    if (driftTime >= 0 || curLineNum == 0) {
      val nextLine = lines[curLineNum + 1]
      val delay = ((nextLine.time - curLine.time - driftTime) / playbackRate).toLong()
      if (delay > 0L) {
        if (isPlay) {
          startTimeout(delay) {
            if (!isPlay) return@startTimeout
            refresh()
          }
        }
        onPlay(curLineNum)
      } else {
        val newCurLineNum = findCurLineNum(currentTime, curLineNum + 1)
        if (newCurLineNum > curLineNum) curLineNum = newCurLineNum - 1
        refresh()
      }
      return
    }

    curLineNum = findCurLineNum(currentTime, curLineNum) - 1
    refresh()
  }

  fun setLyric(lyric: String?, extendedLyrics: List<String>?) {
    if (isPlay) pause()
    this.lyric = lyric.orEmpty()
    this.extendedLyrics = extendedLyrics ?: emptyList()
    init()
  }

  fun setPlaybackRate(playbackRate: Float) {
    this.playbackRate = playbackRate
    if (lines.isEmpty() || !isPlay) return
    play(getCurrentTime())
  }

  open fun onPlay(lineNum: Int) {}

  open fun onSetLyric(lines: List<LyricLine>) {}
}
