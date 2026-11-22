import { memo, useMemo } from 'react'

import SubTitle from '../../components/SubTitle'
import { ExpressiveButtonGroup } from '@/components/common/m3e/ExpressiveButtonGroup'
import { useI18n } from '@/lang'
import { setThemeMode } from '@/core/theme'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'

const MODES: LX.ThemeMode[] = ['system', 'light', 'dark']

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const themeMode = useSettingValue('common.themeMode')

  const options = useMemo(() => {
    return MODES.map(mode => ({ id: mode, label: t(`setting_basic_theme_mode_${mode}`) }))
  }, [t])

  return (
    <SubTitle title={t('setting_basic_theme_mode')}>
      <ExpressiveButtonGroup
        size="sm"
        tone="secondary"
        containerColor={theme['m3-surface-container-high']}
        value={themeMode}
        onChange={setThemeMode}
        options={options}
        style={{ maxWidth: 340, marginTop: 4 }}
      />
    </SubTitle>
  )
})
