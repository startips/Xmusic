import { NativeModules } from 'react-native'

export interface EqBandInfo {
  index: number
  centerFreqHz: number
  level: number
}

export interface AudioEffectInfo {
  supported: boolean
  audioSessionId: number
  minLevel: number
  maxLevel: number
  bands: EqBandInfo[]
}

const AudioEffectNative = NativeModules.AudioEffectModule as {
  bindAudioSession?: (sessionId: number) => Promise<number>
  setEffectConfig?: (enabled: boolean, bandLevels: number[], bassStrength: number, loudnessGainMb: number) => Promise<boolean>
  getEffectInfo?: () => Promise<AudioEffectInfo>
} | undefined

const XmusicPlayerNative = NativeModules.XmusicPlayerModule as {
  setAudioTransitionConfig?: (softPlayPause: boolean, crossfadeMs: number) => Promise<void>
  getAudioSessionId?: () => Promise<number>
} | undefined

export const setNativeAudioTransitionConfig = async(softPlayPause: boolean, crossfadeMs: number) => {
  await XmusicPlayerNative?.setAudioTransitionConfig?.(softPlayPause, crossfadeMs)
}

export const syncNativeAudioSession = async() => {
  const sessionId = await XmusicPlayerNative?.getAudioSessionId?.()
  if (sessionId && sessionId > 0) {
    await AudioEffectNative?.bindAudioSession?.(sessionId)
  }
}

export const setNativeEffectConfig = async(
  enabled: boolean,
  bandLevels: number[],
  bassStrength: number,
  loudnessGainMb: number,
) => {
  await AudioEffectNative?.setEffectConfig?.(enabled, bandLevels, bassStrength, loudnessGainMb)
}

export const getNativeEffectInfo = async(): Promise<AudioEffectInfo> => {
  const info = await AudioEffectNative?.getEffectInfo?.()
  if (info) return info
  return {
    supported: true,
    audioSessionId: 0,
    minLevel: -1500,
    maxLevel: 1500,
    bands: [
      { index: 0, centerFreqHz: 60, level: 0 },
      { index: 1, centerFreqHz: 230, level: 0 },
      { index: 2, centerFreqHz: 910, level: 0 },
      { index: 3, centerFreqHz: 3600, level: 0 },
      { index: 4, centerFreqHz: 14000, level: 0 },
    ],
  }
}
