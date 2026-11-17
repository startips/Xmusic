import themeActions from '@/store/theme/action'
import themeState from '@/store/theme/state'
import settingState from '@/store/setting/state'
import { createActiveTheme, XMUSIC_THEME_ID } from '@/theme/palette'
import { updateSetting } from './common'

/**
 * Resolve the active theme from the user's mode choice and the system
 * light/dark appearance. The app only ships one Xmusic M3 theme; dark mode is
 * simply the dark tonal variation of that same theme.
 */
export const applyThemeByMode = () => {
  const mode = settingState.setting['common.themeMode'] ?? 'system'
  const isDark = mode == 'dark' || (mode == 'system' && themeState.shouldUseDarkColors)
  if (themeState.theme.id == XMUSIC_THEME_ID && themeState.theme.isDark == isDark) return
  themeActions.setTheme(createActiveTheme(isDark))
}

export const setShouldUseDarkColors = (shouldUseDarkColors: boolean) => {
  themeActions.setShouldUseDarkColors(shouldUseDarkColors)
  applyThemeByMode()
}

export const setThemeMode = (mode: LX.ThemeMode) => {
  updateSetting({ 'common.themeMode': mode })
  applyThemeByMode()
}
