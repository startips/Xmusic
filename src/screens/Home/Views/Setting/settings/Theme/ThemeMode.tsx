import { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { setThemeMode } from '@/core/theme'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'
import { createStyle } from '@/utils/tools'

const MODES: LX.ThemeMode[] = ['system', 'light', 'dark']

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const themeMode = useSettingValue('common.themeMode')

  return (
    <SubTitle title={t('setting_basic_theme_mode')}>
      <View
        style={{
          ...styles.segmented,
          backgroundColor: theme['m3-surface-container-low'],
          borderColor: theme['m3-outline-variant'],
        }}
      >
        {MODES.map(mode => {
          const active = themeMode == mode
          return (
            <TouchableOpacity
              key={mode}
              activeOpacity={0.75}
              style={{
                ...styles.btn,
                backgroundColor: active ? theme['m3-secondary-container'] : 'transparent',
              }}
              onPress={() => { setThemeMode(mode) }}
            >
              <Text
                size={13}
                numberOfLines={1}
                style={{ fontWeight: active ? '700' : '500' }}
                color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
              >
                {t(`setting_basic_theme_mode_${mode}`)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: M3Radius.full,
    borderWidth: 0.6,
    padding: 3,
    gap: 4,
    marginTop: 2,
    maxWidth: 340,
  },
  btn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: M3Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
