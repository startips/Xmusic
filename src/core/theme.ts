import themeActions from '@/store/theme/action'
import themeState from '@/store/theme/state'
import settingState from '@/store/setting/state'
import { createActiveTheme, getThemeSeedOption, XMUSIC_THEME_SEED } from '@/theme/palette'
import { buildM3ThemeColors, parseColorToRgb } from '@/theme/m3'
import { syncSplashTheme } from '@/utils/nativeModules/utils'
import { updateSetting } from './common'

const packArgb = (colorStr: string): number => {
  const { r, g, b } = parseColorToRgb(colorStr)
  return (((0xFF << 24) | ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF)) >>> 0)
}

let lastSyncedSplashSig = ''
const syncNativeSplashTheme = (mode: LX.ThemeMode, seed: string) => {
  const sig = `${mode}|${seed}`
  if (sig === lastSyncedSplashSig) return
  lastSyncedSplashSig = sig

  const light = buildM3ThemeColors(seed, false)
  const dark = buildM3ThemeColors(seed, true)
  syncSplashTheme({
    themeMode: mode,
    isCustomSeed: seed !== XMUSIC_THEME_SEED,
    primaryLight: packArgb(light['m3-primary']),
    primaryDark: packArgb(dark['m3-primary']),
    secondaryLight: packArgb(light['m3-secondary']),
    secondaryDark: packArgb(dark['m3-secondary']),
    backgroundLight: packArgb(light['m3-background']),
    backgroundDark: packArgb(dark['m3-background']),
    onSurfaceLight: packArgb(light['m3-on-surface']),
    onSurfaceDark: packArgb(dark['m3-on-surface']),
  })
}

/**
 * Resolve the active theme from the user's mode + seed choice and the system
 * light/dark appearance.
 */
export const applyThemeByMode = () => {
  const mode = settingState.setting['common.themeMode'] ?? 'system'
  const seedOption = getThemeSeedOption(settingState.setting['theme.id'])
  const isDark = mode == 'dark' || (mode == 'system' && themeState.shouldUseDarkColors)
  const useCoverSeed = settingState.setting['theme.dynamicCoverColor'] && Boolean(themeState.coverSeedColor)
  const targetSeed = useCoverSeed ? themeState.coverSeedColor! : seedOption.seed
  syncNativeSplashTheme(mode, targetSeed)
  if (
    themeState.theme.id == seedOption.id &&
    themeState.theme.isDark == isDark &&
    themeState.theme.seedColor == targetSeed
  ) return
  themeActions.setTheme(createActiveTheme(isDark, seedOption.id, useCoverSeed ? targetSeed : null))
}

export const setCoverPalette = (seedColor: string | null, palette: string[] | null) => {
  themeActions.setCoverPalette(seedColor, palette)
  applyThemeByMode()
}

export const setShouldUseDarkColors = (shouldUseDarkColors: boolean) => {
  themeActions.setShouldUseDarkColors(shouldUseDarkColors)
  applyThemeByMode()
}

export const setThemeMode = (mode: LX.ThemeMode) => {
  updateSetting({ 'common.themeMode': mode })
  applyThemeByMode()
}

export const setThemeId = (id: LX.ThemeSeedId) => {
  if (settingState.setting['theme.dynamicCoverColor']) {
    updateSetting({ 'theme.id': id, 'theme.dynamicCoverColor': false })
  } else {
    updateSetting({ 'theme.id': id })
  }
  applyThemeByMode()
}
