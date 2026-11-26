package cn.toside.music.mobile.player.dsp

/**
 * Thread-safe DSP parameter store shared across the RN bridge and ExoPlayer audio thread.
 */
object XmusicDspConfig {
  val CENTER_FREQS_HZ: IntArray = intArrayOf(60, 230, 910, 3600, 14000)
  const val NUM_EQ_BANDS: Int = 5

  private val lock = Any()
  private var enabled: Boolean = false
  private val bandsMb: IntArray = intArrayOf(0, 0, 0, 0, 0)
  private var bassStrength: Int = 0
  private var loudnessGainMb: Int = 0

  @Volatile
  private var configVersion: Int = 1

  fun updateConfig(
    isEnabled: Boolean,
    nextBandsMb: IntArray?,
    nextBassStrength: Int,
    nextLoudnessGainMb: Int,
  ) {
    synchronized(lock) {
      enabled = isEnabled
      for (i in 0 until NUM_EQ_BANDS) {
        val v = if (nextBandsMb != null && i < nextBandsMb.size) nextBandsMb[i] else 0
        bandsMb[i] = v.coerceIn(-1500, 1500)
      }
      bassStrength = nextBassStrength.coerceIn(0, 1000)
      loudnessGainMb = nextLoudnessGainMb.coerceIn(0, 1200)
      configVersion++
    }
  }

  fun getConfigVersion(): Int = configVersion

  fun isEnabled(): Boolean = synchronized(lock) { enabled }

  fun copySnapshot(bandsOut: IntArray?, extraOut: IntArray?): Int {
    synchronized(lock) {
      if (bandsOut != null) {
        val copyLen = minOf(bandsOut.size, NUM_EQ_BANDS)
        System.arraycopy(bandsMb, 0, bandsOut, 0, copyLen)
      }
      if (extraOut != null && extraOut.size >= 3) {
        extraOut[0] = if (enabled) 1 else 0
        extraOut[1] = bassStrength
        extraOut[2] = loudnessGainMb
      }
      return configVersion
    }
  }
}
