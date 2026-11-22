import { useMemo } from 'react'

import { TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'
import { createStyle } from '@/utils/tools'
import styles from './style'

type Align_Type = LX.AppSetting['playDetail.style.align']

const ALIGN_LIST = [
  'left',
  'center',
  'right',
] as const

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const currentAlign = useSettingValue('playDetail.style.align')
  const list = useMemo(() => {
    return ALIGN_LIST.map(id => ({ id, name: t(`play_detail_setting_lrc_align_${id}`) }))
  }, [t])

  const setPosition = (id: Align_Type) => {
    if (currentAlign == id) return
    updateSetting({ 'playDetail.style.align': id })
  }

  return (
    <View style={styles.container}>
      <Text>{t('play_detail_setting_lrc_align')}</Text>
      <View style={styles.content}>
        <View style={{ ...segStyles.segmented, backgroundColor: theme['m3-surface-container-low'], borderColor: theme['m3-outline-variant'] }}>
          {
            list.map(({ id, name }) => {
              const isActive = currentAlign == id
              return (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.75}
                  style={{
                    ...segStyles.btn,
                    backgroundColor: isActive ? theme['m3-secondary-container'] : 'transparent',
                  }}
                  onPress={() => { setPosition(id) }}
                >
                  <Text
                    size={13}
                    style={{ fontWeight: isActive ? '700' : '500' }}
                    color={isActive ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              )
            })
          }
        </View>
      </View>
    </View>
  )
}

const segStyles = createStyle({
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: M3Radius.full,
    borderWidth: 0.6,
    padding: 3,
    gap: 4,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: M3Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
