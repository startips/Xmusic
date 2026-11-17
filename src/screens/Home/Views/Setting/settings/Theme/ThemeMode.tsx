import { memo } from 'react'
import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useI18n } from '@/lang'
import { setThemeMode } from '@/core/theme'
import { useSettingValue } from '@/store/setting/hook'
import { createStyle } from '@/utils/tools'

const MODES: LX.ThemeMode[] = ['system', 'light', 'dark']

export default memo(() => {
  const t = useI18n()
  const themeMode = useSettingValue('common.themeMode')

  return (
    <SubTitle title={t('setting_basic_theme_mode')}>
      <View style={styles.list}>
        {MODES.map(mode => (
          <CheckBox
            key={mode}
            marginRight={12}
            need
            check={themeMode == mode}
            label={t(`setting_basic_theme_mode_${mode}`)}
            onChange={() => { setThemeMode(mode) }}
          />
        ))}
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
})
