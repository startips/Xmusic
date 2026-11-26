package cn.toside.music.mobile.player.dsp

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor.AudioFormat
import androidx.media3.common.audio.AudioProcessor.UnhandledAudioFormatException
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToLong
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tanh

/**
 * In-engine 64-bit internal / 32-bit float DSP processor for ExoPlayer DefaultAudioSink.
 * Runs parametric 5-band EQ, low-shelf bass boost, loudness gain, soft-knee limiter,
 * and sample-accurate silence pre-roll + raised-cosine fade-in directly in PCM stream,
 * eliminating Android HAL AudioEffect cold-start and seek pops without audio-thread allocations.
 */
@UnstableApi
class XmusicDspAudioProcessor private constructor() : BaseAudioProcessor() {

  companion object {
    private const val NUM_EQ_BANDS = XmusicDspConfig.NUM_EQ_BANDS
    private const val NUM_STAGES = 6 // 5 peaking EQ bands + 1 low-shelf bass boost
    private const val MAX_CHANNELS = 8
    private const val PEAKING_Q = 0.85
    private const val BASS_SHELF_HZ = 85.0
    private const val BASS_SHELF_Q = 0.7071067811865476

    val instance: XmusicDspAudioProcessor = XmusicDspAudioProcessor()
  }

  @Volatile
  private var pendingResumeRamp = false

  // Audio-thread-only primitive arrays to guarantee zero GC allocations per buffer
  private var appliedConfigVersion = -1
  private var appliedSampleRate = 0
  private var localEnabled = false
  private val localBandsSnapshot = IntArray(NUM_EQ_BANDS)
  private val localExtraSnapshot = IntArray(3)
  private var loudnessLinear = 1.0

  private val b0 = DoubleArray(NUM_STAGES) { 1.0 }
  private val b1 = DoubleArray(NUM_STAGES)
  private val b2 = DoubleArray(NUM_STAGES)
  private val a1 = DoubleArray(NUM_STAGES)
  private val a2 = DoubleArray(NUM_STAGES)
  private val stageActive = BooleanArray(NUM_STAGES)
  private val z1 = Array(NUM_STAGES) { DoubleArray(MAX_CHANNELS) }
  private val z2 = Array(NUM_STAGES) { DoubleArray(MAX_CHANNELS) }

  private var wetMix = 0.0f
  private var prerollFramesRemaining = 0
  private var rampTotalFrames = 0
  private var rampFramesDone = 0

  fun notifyPlayResume() {
    pendingResumeRamp = true
  }

  private fun zeroDelayLines() {
    for (s in 0 until NUM_STAGES) {
      val row1 = z1[s]
      val row2 = z2[s]
      for (c in 0 until MAX_CHANNELS) {
        row1[c] = 0.0
        row2[c] = 0.0
      }
    }
  }

  private fun setIdentityStage(s: Int) {
    b0[s] = 1.0
    b1[s] = 0.0
    b2[s] = 0.0
    a1[s] = 0.0
    a2[s] = 0.0
    stageActive[s] = false
  }

  private fun rebuildCoeffsIfNeeded(sampleRate: Int) {
    var ver = XmusicDspConfig.getConfigVersion()
    if (appliedConfigVersion == ver && appliedSampleRate == sampleRate) {
      return
    }
    ver = XmusicDspConfig.copySnapshot(localBandsSnapshot, localExtraSnapshot)
    val en = localExtraSnapshot[0] != 0
    val bass = localExtraSnapshot[1]
    val loud = localExtraSnapshot[2]

    if (!localEnabled && en && wetMix <= 0.001f && prerollFramesRemaining <= 0) {
      zeroDelayLines()
    }

    localEnabled = en
    appliedSampleRate = sampleRate
    appliedConfigVersion = ver

    if (!en || sampleRate <= 0) {
      for (s in 0 until NUM_STAGES) {
        setIdentityStage(s)
      }
      loudnessLinear = 1.0
      return
    }

    for (i in 0 until NUM_EQ_BANDS) {
      val mb = localBandsSnapshot[i]
      val freq = XmusicDspConfig.CENTER_FREQS_HZ[i].toDouble()
      if (abs(mb) < 5 || freq >= sampleRate * 0.45) {
        setIdentityStage(i)
        continue
      }
      val gainDb = mb / 100.0
      val amp = 10.0.pow(gainDb / 40.0)
      val w0 = (2.0 * PI * freq) / sampleRate
      val cosW0 = cos(w0)
      val alpha = sin(w0) / (2.0 * PEAKING_Q)
      val a0 = 1.0 + alpha / amp
      b0[i] = (1.0 + alpha * amp) / a0
      b1[i] = (-2.0 * cosW0) / a0
      b2[i] = (1.0 - alpha * amp) / a0
      a1[i] = b1[i]
      a2[i] = (1.0 - alpha / amp) / a0
      stageActive[i] = true
    }

    if (bass <= 0 || BASS_SHELF_HZ >= sampleRate * 0.45) {
      setIdentityStage(5)
    } else {
      val gainDb = (bass / 1000.0) * 9.0
      val amp = 10.0.pow(gainDb / 40.0)
      val w0 = (2.0 * PI * BASS_SHELF_HZ) / sampleRate
      val cosW0 = cos(w0)
      val sinW0 = sin(w0)
      val twoSqrtAAlpha = 2.0 * sqrt(amp) * (sinW0 / (2.0 * BASS_SHELF_Q))
      val a0 = (amp + 1.0) + (amp - 1.0) * cosW0 + twoSqrtAAlpha
      b0[5] = (amp * ((amp + 1.0) - (amp - 1.0) * cosW0 + twoSqrtAAlpha)) / a0
      b1[5] = (2.0 * amp * ((amp - 1.0) - (amp + 1.0) * cosW0)) / a0
      b2[5] = (amp * ((amp + 1.0) - (amp - 1.0) * cosW0 - twoSqrtAAlpha)) / a0
      a1[5] = (-2.0 * ((amp - 1.0) + (amp + 1.0) * cosW0)) / a0
      a2[5] = ((amp + 1.0) + (amp - 1.0) * cosW0 - twoSqrtAAlpha) / a0
      stageActive[5] = true
    }

    loudnessLinear = if (loud > 0) 10.0.pow(loud / 2000.0) else 1.0
  }

  @Throws(UnhandledAudioFormatException::class)
  override fun onConfigure(inputAudioFormat: AudioFormat): AudioFormat {
    if (inputAudioFormat.channelCount < 1 ||
      inputAudioFormat.channelCount > MAX_CHANNELS ||
      inputAudioFormat.sampleRate <= 0
    ) {
      return AudioFormat.NOT_SET
    }
    val enc = inputAudioFormat.encoding
    if (enc != C.ENCODING_PCM_16BIT &&
      enc != C.ENCODING_PCM_24BIT &&
      enc != C.ENCODING_PCM_32BIT &&
      enc != C.ENCODING_PCM_FLOAT
    ) {
      return AudioFormat.NOT_SET
    }
    return inputAudioFormat
  }

  override fun onFlush() {
    zeroDelayLines()
    appliedConfigVersion = -1
    appliedSampleRate = 0
    val initEnabled = XmusicDspConfig.isEnabled()
    localEnabled = initEnabled
    wetMix = if (initEnabled) 1.0f else 0.0f

    val sr = if (inputAudioFormat.sampleRate > 0) inputAudioFormat.sampleRate else 44100
    prerollFramesRemaining = (sr * 28) / 1000
    rampTotalFrames = max(1, (sr * 180) / 1000)
    rampFramesDone = 0
    pendingResumeRamp = false
  }

  override fun onReset() {
    zeroDelayLines()
    appliedConfigVersion = -1
    appliedSampleRate = 0
    wetMix = 0.0f
    prerollFramesRemaining = 0
    rampTotalFrames = 0
    rampFramesDone = 0
    pendingResumeRamp = false
  }

  override fun queueInput(inputBuffer: ByteBuffer) {
    val remaining = inputBuffer.remaining()
    if (remaining == 0) return

    val fmt = inputAudioFormat
    val sr = fmt.sampleRate
    val chCount = fmt.channelCount
    val bytesPerFrame = fmt.bytesPerFrame
    if (sr <= 0 || chCount <= 0 || chCount > MAX_CHANNELS || bytesPerFrame <= 0) {
      inputBuffer.position(inputBuffer.limit())
      return
    }

    inputBuffer.order(ByteOrder.nativeOrder())
    val frames = remaining / bytesPerFrame
    if (frames <= 0) {
      inputBuffer.position(inputBuffer.limit())
      return
    }

    rebuildCoeffsIfNeeded(sr)

    if (pendingResumeRamp) {
      pendingResumeRamp = false
      val minPreroll = (sr * 16) / 1000
      val minRamp = max(1, (sr * 140) / 1000)
      if (prerollFramesRemaining < minPreroll) {
        prerollFramesRemaining = minPreroll
      }
      if (rampFramesDone >= rampTotalFrames || rampTotalFrames < minRamp) {
        rampTotalFrames = minRamp
        rampFramesDone = 0
      }
    }

    if (!localEnabled &&
      wetMix <= 0.0001f &&
      prerollFramesRemaining <= 0 &&
      rampFramesDone >= rampTotalFrames
    ) {
      wetMix = 0.0f
      val outPass = replaceOutputBuffer(remaining)
      outPass.put(inputBuffer)
      outPass.flip()
      return
    }

    val out = replaceOutputBuffer(remaining)
    val targetWet = if (localEnabled) 1.0f else 0.0f
    val wetStep = 1.0f / max(64.0f, sr * 0.035f)
    val encoding = fmt.encoding

    for (f in 0 until frames) {
      if (wetMix < targetWet) {
        wetMix = min(targetWet, wetMix + wetStep)
      } else if (wetMix > targetWet) {
        wetMix = max(targetWet, wetMix - wetStep)
      }

      val env: Double
      if (prerollFramesRemaining > 0) {
        prerollFramesRemaining--
        env = 0.0
      } else if (rampFramesDone < rampTotalFrames) {
        rampFramesDone++
        val p = rampFramesDone.toDouble() / rampTotalFrames.toDouble()
        env = 0.5 * (1.0 - cos(PI * p))
      } else {
        env = 1.0
      }

      val runDsp = wetMix > 0.0001f || (localEnabled && env == 0.0)

      for (c in 0 until chCount) {
        val x: Double = when (encoding) {
          C.ENCODING_PCM_16BIT -> inputBuffer.short / 32768.0
          C.ENCODING_PCM_24BIT -> {
            val b0Byte = inputBuffer.get().toInt() and 0xFF
            val b1Byte = inputBuffer.get().toInt() and 0xFF
            val b2Byte = inputBuffer.get().toInt()
            val s24 = b0Byte or (b1Byte shl 8) or (b2Byte shl 16)
            s24 / 8388608.0
          }
          C.ENCODING_PCM_32BIT -> inputBuffer.int / 2147483648.0
          else -> inputBuffer.float.toDouble()
        }

        val sample: Double
        if (runDsp) {
          var wet = x
          for (s in 0 until NUM_STAGES) {
            if (!stageActive[s]) continue
            val row1 = z1[s]
            val row2 = z2[s]
            var v = b0[s] * wet + row1[c]
            val nz1 = b1[s] * wet - a1[s] * v + row2[c]
            val nz2 = b2[s] * wet - a2[s] * v
            if (v.isNaN() || v.isInfinite()) {
              row1[c] = 0.0
              row2[c] = 0.0
              v = wet
            } else {
              row1[c] = nz1
              row2[c] = nz2
            }
            wet = v
          }
          wet *= loudnessLinear
          val absW = abs(wet)
          if (absW > 0.85) {
            val excess = (absW - 0.85) / 0.15
            val limited = 0.85 + 0.15 * tanh(excess)
            wet = if (wet >= 0.0) limited else -limited
          }
          sample = x + (wet - x) * wetMix
        } else {
          sample = x
        }

        var y = sample * env
        if (y > 1.0) y = 1.0 else if (y < -1.0) y = -1.0

        when (encoding) {
          C.ENCODING_PCM_16BIT -> {
            val s16 = (y * 32767.0).roundToLong().coerceIn(-32768L, 32767L).toInt()
            out.putShort(s16.toShort())
          }
          C.ENCODING_PCM_24BIT -> {
            val o24 = (y * 8388607.0).roundToLong().coerceIn(-8388608L, 8388607L).toInt()
            out.put((o24 and 0xFF).toByte())
            out.put(((o24 shr 8) and 0xFF).toByte())
            out.put(((o24 shr 16) and 0xFF).toByte())
          }
          C.ENCODING_PCM_32BIT -> {
            val s32 = (y * 2147483647.0).roundToLong().coerceIn(-2147483648L, 2147483647L).toInt()
            out.putInt(s32)
          }
          else -> {
            out.putFloat(y.toFloat())
          }
        }
      }
    }

    if (inputBuffer.hasRemaining()) {
      while (inputBuffer.hasRemaining()) {
        out.put(inputBuffer.get())
      }
    }
    out.flip()
  }
}
