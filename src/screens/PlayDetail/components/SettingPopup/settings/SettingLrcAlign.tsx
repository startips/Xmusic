import { useMemo } from 'react'
import { View } from 'react-native'
import { ExpressiveButtonGroup, type ExpressiveGroupOption } from '@/components/common/m3e/ExpressiveButtonGroup'
import { SegmentedCardItem } from '@/components/common/m3e/SegmentedCard'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import styles from './style'

type Align_Type = LX.AppSetting['playDetail.style.align']

const ALIGN_LIST: readonly Align_Type[] = ['left', 'center', 'right']

const AlignIcon = ({ align, color }: { align: Align_Type, color: string }) => {
  const alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
  return (
    <View style={{ width: 11, height: 10, justifyContent: 'space-between', alignItems }}>
      <View style={{ width: 11, height: 1.8, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 7, height: 1.8, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 9.5, height: 1.8, borderRadius: 1, backgroundColor: color }} />
    </View>
  )
}

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const currentAlign = useSettingValue('playDetail.style.align')

  const options = useMemo<Array<ExpressiveGroupOption<Align_Type>>>(() => {
    return ALIGN_LIST.map(id => ({
      id,
      label: t(`play_detail_setting_lrc_align_${id}`),
      icon: (_active, color) => <AlignIcon align={id} color={color} />,
    }))
  }, [t])

  const setPosition = (id: Align_Type) => {
    if (currentAlign == id) return
    updateSetting({ 'playDetail.style.align': id })
  }

  return (
    <SegmentedCardItem index={3} count={4}>
      <View style={styles.blockCard}>
        <Text size={13.5} color={theme['m3-on-surface']} style={styles.titleText} numberOfLines={1}>
          {t('play_detail_setting_lrc_align')}
        </Text>
        <ExpressiveButtonGroup
          size="sm"
          tone="primary"
          containerColor={theme['m3-surface-container-high']}
          value={currentAlign}
          onChange={setPosition}
          options={options}
        />
      </View>
    </SegmentedCardItem>
  )
}
