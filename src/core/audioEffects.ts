import settingState from '@/store/setting/state'
import {
  setNativeAudioTransitionConfig,
  setNativeEffectConfig,
  syncNativeAudioSession,
} from '@/utils/nativeModules/audioEffect'

export type EqPresetId = LX.AppSetting['player.eqPreset']

export const EQ_PRESET_LEVELS: Record<Exclude<EqPresetId, 'custom'>, [number, number, number, number, number]> = {
  flat: [0, 0, 0, 0, 0],
  pop: [-100, 280, 450, 180, -120],
  rock: [480, 260, -140, 320, 500],
  classical: [420, 260, -160, 340, 420],
  jazz: [360, 180, -140, 220, 440],
  vocal: [-220, 120, 520, 380, 80],
  bass: [680, 450, 60, -80, -120],
}

export const EQ_PRESET_LIST: EqPresetId[] = [
  'flat',
  'pop',
  'rock',
  'classical',
  'jazz',
  'vocal',
  'bass',
  'custom',
]

export const parseEqBands = (raw: string | undefined, count = 5): number[] => {
  const parts = (raw ?? '').split(',').map(s => Number.parseInt(s.trim(), 10))
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const val = parts[i]
    out.push(Number.isFinite(val) ? Math.max(-1500, Math.min(1500, val)) : 0)
  }
  return out
}

export const serializeEqBands = (levels: number[]): string => {
  return levels.map(v => Math.round(v)).join(',')
}

export const syncAudioTransitionFromSetting = (setting: LX.AppSetting = settingState.setting) => {
  const softPlayPause = setting['player.isSoftPlayPause']
  const crossfadeMs = Math.max(0, Math.round((setting['player.crossfadeDuration'] ?? 0) * 1000))
  void setNativeAudioTransitionConfig(softPlayPause, crossfadeMs)
}

export const syncAudioEffectsFromSetting = (setting: LX.AppSetting = settingState.setting) => {
  const enabled = setting['player.eqEnabled']
  const bands = parseEqBands(setting['player.eqBands'], 5)
  const bass = setting['player.bassBoost'] ?? 0
  const loudness = setting['player.loudnessGain'] ?? 0
  void setNativeEffectConfig(enabled, bands, bass, loudness)
  if (enabled) {
    void syncNativeAudioSession()
  }
}
