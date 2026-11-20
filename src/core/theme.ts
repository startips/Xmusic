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
  if (themeState.theme.id == seedOption.id && themeState.theme.isDark == isDark) return
  themeActions.setTheme(createActiveTheme(isDark, seedOption.id))
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
  updateSetting({ 'theme.id': id })
  applyThemeByMode()
}
