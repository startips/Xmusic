import { getAppearance, getIsSupportedAutoTheme, onAppearanceChange } from '@/utils/tools'
import { setShouldUseDarkColors, applyThemeByMode } from '@/core/theme'
import StatusBar from '@/components/common/StatusBar'
import { navigations } from '@/navigation'

export default async(setting: LX.AppSetting) => {
  global.state_event.on('themeUpdated', (theme) => {
    StatusBar.setBarStyle(theme.isDark ? 'light-content' : 'dark-content')
    navigations.syncScreenNavigationTheme(theme)
  })

  global.state_event.on('configUpdated', (keys) => {
    if (
      keys.includes('common.themeMode') ||
      keys.includes('theme.id') ||
      keys.includes('theme.dynamicCoverColor')
    ) applyThemeByMode()
  })

  if (getIsSupportedAutoTheme()) {
    setShouldUseDarkColors(getAppearance() == 'dark')

    onAppearanceChange(color => {
      setShouldUseDarkColors((color ?? 'light') == 'dark')
    })
  }

  applyThemeByMode()
}
