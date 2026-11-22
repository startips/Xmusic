import themeActions from '@/store/theme/action'
import themeState from '@/store/theme/state'
import settingState from '@/store/setting/state'
import { createActiveTheme, getThemeSeedOption } from '@/theme/palette'
import { updateSetting } from './common'

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
