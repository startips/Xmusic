package cn.toside.music.mobile.player

import cn.toside.music.mobile.player.dsp.XmusicDspConfig
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class AudioEffectModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val bandCount = XmusicDspConfig.CENTER_FREQS_HZ.size

  private var currentSessionId = 0
  private var enabled = false
  private var desiredBandsMb = IntArray(bandCount)
  private var desiredBassStrength = 0
  private var desiredLoudnessGainMb = 0

  override fun getName(): String = "AudioEffectModule"

  @ReactMethod
  fun bindAudioSession(sessionId: Int, promise: Promise) {
    currentSessionId = sessionId.coerceAtLeast(0)
    promise.resolve(currentSessionId)
  }

  @ReactMethod
  fun setEffectConfig(
    isEnabled: Boolean,
    bandLevels: ReadableArray?,
    bassStrength: Int,
    loudnessGainMb: Int,
    promise: Promise,
  ) {
    val nextBands = IntArray(bandCount) { i ->
      val valMb = if (bandLevels != null && i < bandLevels.size()) bandLevels.getInt(i) else 0
      valMb.coerceIn(-1500, 1500)
    }
    val clampedBass = bassStrength.coerceIn(0, 1000)
    val clampedLoud = loudnessGainMb.coerceIn(0, 1200)

    synchronized(this) {
      enabled = isEnabled
      desiredBandsMb = nextBands
      desiredBassStrength = clampedBass
      desiredLoudnessGainMb = clampedLoud
    }

    XmusicDspConfig.updateConfig(isEnabled, nextBands, clampedBass, clampedLoud)
    promise.resolve(true)
  }

  @ReactMethod
  fun getEffectInfo(promise: Promise) {
    val snapshotBands: IntArray
    val sessionId: Int
    synchronized(this) {
      snapshotBands = desiredBandsMb.clone()
      sessionId = currentSessionId
    }

    val result = Arguments.createMap().apply {
      putInt("audioSessionId", sessionId)
      putBoolean("supported", true)
      putInt("minLevel", -1500)
      putInt("maxLevel", 1500)
      val bandsArr = Arguments.createArray()
      for (i in 0 until bandCount) {
        val bandMap = Arguments.createMap().apply {
          putInt("index", i)
          putInt("centerFreqHz", XmusicDspConfig.CENTER_FREQS_HZ[i])
          putInt("level", if (i < snapshotBands.size) snapshotBands[i] else 0)
        }
        bandsArr.pushMap(bandMap)
      }
      putArray("bands", bandsArr)
    }
    promise.resolve(result)
  }
}
