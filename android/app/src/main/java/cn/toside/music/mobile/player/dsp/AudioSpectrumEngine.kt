package cn.toside.music.mobile.player.dsp

import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Zero-GC, permission-free real-time PCM audio spectrum analyzer tapped directly
 * from [XmusicDspAudioProcessor].
 *
 * Uses pre-allocated FFT tables and a wait-free SPMC timestamped ring buffer for
 * ~180ms AudioTrack A/V latency alignment. Bypassed with zero overhead when no
 * UI consumer is actively registered.
 */
object AudioSpectrumEngine {
  const val FFT_SIZE = 1024
  const val BAND_COUNT = 32
  private const val HOP_SIZE = 1024
  private const val HISTORY_SLOTS = 24
  private const val DEFAULT_LATENCY_NS = 180_000_000L
  private const val STALE_TIMEOUT_NS = 650_000_000L

  private val activeConsumers = AtomicInteger(0)

  @Volatile
  var onConsumerPresenceChanged: ((Boolean) -> Unit)? = null

  private val hannWindow = FloatArray(FFT_SIZE) { i ->
    (0.5 * (1.0 - cos((2.0 * PI * i) / (FFT_SIZE - 1)))).toFloat()
  }
  private val bitRev = IntArray(FFT_SIZE).also { tbl ->
    var bits = 0
    var n = FFT_SIZE
    while (n > 1) {
      bits++
      n = n ushr 1
    }
    for (i in 0 until FFT_SIZE) {
      var x = i
      var r = 0
      for (b in 0 until bits) {
        r = (r shl 1) or (x and 1)
        x = x ushr 1
      }
      tbl[i] = r
    }
  }
  private val cosTable = FloatArray(FFT_SIZE / 2) { i ->
    cos((-2.0 * PI * i) / FFT_SIZE).toFloat()
  }
  private val sinTable = FloatArray(FFT_SIZE / 2) { i ->
    sin((-2.0 * PI * i) / FFT_SIZE).toFloat()
  }

  private val pcmRing = FloatArray(FFT_SIZE)
  private var pcmWritePos = 0
  private var samplesAccumulated = 0
  private val fftRe = FloatArray(FFT_SIZE)
  private val fftIm = FloatArray(FFT_SIZE)
  private val magBins = FloatArray(FFT_SIZE / 2)
  private val bandStartBin = IntArray(BAND_COUNT)
  private val bandEndBin = IntArray(BAND_COUNT)
  private val bandTilt = FloatArray(BAND_COUNT) { b ->
    val frac = b.toFloat() / (BAND_COUNT - 1).toFloat()
    1.0f + 1.95f * frac.pow(1.12f)
  }
  private var mappedSampleRate = 0
  private var agcCeilingDb = -10.0f

  private val slotBands = Array(HISTORY_SLOTS) { FloatArray(BAND_COUNT) }
  private val slotBass = FloatArray(HISTORY_SLOTS)
  private val slotMid = FloatArray(HISTORY_SLOTS)
  private val slotTreble = FloatArray(HISTORY_SLOTS)
  private val slotTimestampsNs = LongArray(HISTORY_SLOTS)

  @Volatile
  private var writeSeq: Long = 0L

  @Volatile
  private var resetEpoch: Int = 0
  private var audioThreadEpoch: Int = 0

  fun hasConsumers(): Boolean = activeConsumers.get() > 0

  fun registerConsumer() {
    val count = activeConsumers.incrementAndGet()
    if (count == 1) {
      onConsumerPresenceChanged?.invoke(true)
    }
  }

  fun unregisterConsumer() {
    while (true) {
      val cur = activeConsumers.get()
      if (cur <= 0) return
      val next = cur - 1
      if (activeConsumers.compareAndSet(cur, next)) {
        if (next == 0) {
          onConsumerPresenceChanged?.invoke(false)
        }
        return
      }
    }
  }

  /**
   * Reset spectrum state on track flush/seek/reset to clear stale frames.
   */
  fun reset() {
    resetEpoch++
    writeSeq = 0L
  }

  /**
   * Push one mono downmixed sample in [-1f, 1f] from the audio thread.
   */
  fun pushMonoSample(sample: Float, sampleRate: Int, nowNs: Long = System.nanoTime()) {
    val epoch = resetEpoch
    if (audioThreadEpoch != epoch) {
      audioThreadEpoch = epoch
      pcmRing.fill(0f)
      pcmWritePos = 0
      samplesAccumulated = 0
      agcCeilingDb = -10.0f
    }

    pcmRing[pcmWritePos] = sample
    pcmWritePos = (pcmWritePos + 1) and (FFT_SIZE - 1)
    samplesAccumulated++

    if (samplesAccumulated >= HOP_SIZE) {
      samplesAccumulated = 0
      computeFrame(sampleRate, nowNs)
    }
  }

  private fun ensureBandMapping(sampleRate: Int) {
    val sr = if (sampleRate > 0) sampleRate else 44100
    if (mappedSampleRate == sr) return
    mappedSampleRate = sr

    val nyquist = sr * 0.5
    val minHz = 35.0
    val maxHz = min(16000.0, nyquist * 0.92)
    val binHz = sr.toDouble() / FFT_SIZE.toDouble()
    val maxBin = (FFT_SIZE / 2) - 1

    val logMin = ln(minHz)
    val logRange = ln(maxHz) - logMin

    for (b in 0 until BAND_COUNT) {
      val f0 = exp(logMin + logRange * (b.toDouble() / BAND_COUNT))
      val f1 = exp(logMin + logRange * ((b + 1).toDouble() / BAND_COUNT))
      val s = min(maxBin, max(1, (f0 / binHz).toInt()))
      val e = min(maxBin, max(s, (f1 / binHz).toInt()))
      bandStartBin[b] = s
      bandEndBin[b] = e
    }
  }

  private fun computeFrame(sampleRate: Int, nowNs: Long) {
    ensureBandMapping(sampleRate)

    val startIdx = pcmWritePos
    for (i in 0 until FFT_SIZE) {
      val sample = pcmRing[(startIdx + i) and (FFT_SIZE - 1)] * hannWindow[i]
      val rev = bitRev[i]
      fftRe[rev] = sample
      fftIm[rev] = 0f
    }

    var size = 2
    while (size <= FFT_SIZE) {
      val halfSize = size ushr 1
      val tableStep = FFT_SIZE / size
      var i = 0
      while (i < FFT_SIZE) {
        var k = 0
        for (j in i until i + halfSize) {
          val l = j + halfSize
          val wr = cosTable[k]
          val wi = sinTable[k]
          val tr = fftRe[l] * wr - fftIm[l] * wi
          val ti = fftRe[l] * wi + fftIm[l] * wr
          fftRe[l] = fftRe[j] - tr
          fftIm[l] = fftIm[j] - ti
          fftRe[j] += tr
          fftIm[j] += ti
          k += tableStep
        }
        i += size
      }
      size = size shl 1
    }

    val invNorm = 2.0f / FFT_SIZE.toFloat()
    val halfN = FFT_SIZE ushr 1
    for (i in 1 until halfN) {
      val re = fftRe[i]
      val im = fftIm[i]
      magBins[i] = sqrt(re * re + im * im) * invNorm
    }

    val nextSeq = writeSeq + 1L
    val slot = (nextSeq % HISTORY_SLOTS).toInt()
    val out = slotBands[slot]

    var framePeakDb = -72.0f
    for (b in 0 until BAND_COUNT) {
      val sBin = bandStartBin[b]
      val eBin = bandEndBin[b]
      var maxM = 0f
      var sumM = 0f
      val count = (eBin - sBin + 1).coerceAtLeast(1)
      for (bin in sBin..eBin) {
        val m = magBins[bin]
        if (m > maxM) maxM = m
        sumM += m
      }
      val blended = (0.65f * maxM + 0.35f * (sumM / count)) * bandTilt[b]
      val db = (20.0 * log10(blended.toDouble() + 1e-6)).toFloat()
      out[b] = db
      if (db > framePeakDb) framePeakDb = db
    }

    val targetPeak = framePeakDb.coerceIn(-34.0f, -2.0f)
    agcCeilingDb = if (targetPeak > agcCeilingDb) {
      agcCeilingDb + (targetPeak - agcCeilingDb) * 0.25f
    } else {
      agcCeilingDb + (targetPeak - agcCeilingDb) * 0.015f
    }
    val floorDb = agcCeilingDb - 46.0f
    val invRange = 1.0f / 46.0f

    var bassSum = 0f
    var bassMax = 0f
    var midSum = 0f
    var midMax = 0f
    var trebleSum = 0f
    var trebleMax = 0f

    for (b in 0 until BAND_COUNT) {
      val shaped = ((out[b] - floorDb) * invRange).coerceIn(0f, 1f).pow(0.88f)
      out[b] = shaped
      when {
        b < 6 -> {
          bassSum += shaped
          if (shaped > bassMax) bassMax = shaped
        }
        b < 19 -> {
          midSum += shaped
          if (shaped > midMax) midMax = shaped
        }
        else -> {
          trebleSum += shaped
          if (shaped > trebleMax) trebleMax = shaped
        }
      }
    }

    slotBass[slot] = (0.55f * bassMax + 0.45f * (bassSum / 6f)).coerceIn(0f, 1f)
    slotMid[slot] = (0.55f * midMax + 0.45f * (midSum / 13f)).coerceIn(0f, 1f)
    slotTreble[slot] = (0.55f * trebleMax + 0.45f * (trebleSum / (BAND_COUNT - 19).toFloat())).coerceIn(0f, 1f)
    slotTimestampsNs[slot] = nowNs

    writeSeq = nextSeq
  }

  /**
   * Sample the latency-aligned spectrum frame. Returns false with zeroed outputs if
   * no recent audio frames exist within [STALE_TIMEOUT_NS].
   */
  fun sampleSpectrum(
    outBands: FloatArray?,
    outEnergies: FloatArray? = null,
    nowNs: Long = System.nanoTime(),
    latencyNs: Long = DEFAULT_LATENCY_NS,
  ): Boolean {
    val latestSeq = writeSeq
    if (latestSeq <= 0L) {
      outBands?.fill(0f)
      outEnergies?.fill(0f)
      return false
    }

    val latestSlot = (latestSeq % HISTORY_SLOTS).toInt()
    val latestTs = slotTimestampsNs[latestSlot]
    if (latestTs <= 0L || nowNs - latestTs > STALE_TIMEOUT_NS) {
      outBands?.fill(0f)
      outEnergies?.fill(0f)
      return false
    }

    val targetTs = nowNs - latencyNs
    val minSeq = max(1L, latestSeq - (HISTORY_SLOTS - 3))
    var chosenSlot = latestSlot
    var bestDiff = Long.MAX_VALUE

    var seq = latestSeq
    while (seq >= minSeq) {
      val s = (seq % HISTORY_SLOTS).toInt()
      val ts = slotTimestampsNs[s]
      if (ts > 0L) {
        val diff = abs(ts - targetTs)
        if (diff < bestDiff) {
          bestDiff = diff
          chosenSlot = s
        }
        if (ts <= targetTs) break
      }
      seq--
    }

    if (outBands != null) {
      val src = slotBands[chosenSlot]
      System.arraycopy(src, 0, outBands, 0, min(outBands.size, BAND_COUNT))
    }
    if (outEnergies != null && outEnergies.size >= 3) {
      outEnergies[0] = slotBass[chosenSlot]
      outEnergies[1] = slotMid[chosenSlot]
      outEnergies[2] = slotTreble[chosenSlot]
    }
    return true
  }
}
