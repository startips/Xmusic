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

type VisualizerMode = LX.AppSetting['playDetail.visualizerMode']

const MODES: readonly VisualizerMode[] = ['off', 'ambient', 'bars', 'ribbon']

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const mode = useSettingValue('playDetail.visualizerMode')

  const options = useMemo<Array<ExpressiveGroupOption<VisualizerMode>>>(() => {
    return MODES.map(id => ({
      id,
      label: t(`play_detail_setting_visualizer_${id}`),
    }))
  }, [t])

  const handleChange = (id: VisualizerMode) => {
    if (mode === id) return
    updateSetting({ 'playDetail.visualizerMode': id })
  }

  return (
    <SegmentedCardItem index={1} count={2}>
      <View style={styles.blockCard}>
        <Text size={13.5} color={theme['m3-on-surface']} style={styles.titleText} numberOfLines={1}>
          {t('play_detail_setting_visualizer')}
        </Text>
        <ExpressiveButtonGroup
          size="sm"
          tone="primary"
          containerColor={theme['m3-surface-container-high']}
          value={mode}
          onChange={handleChange}
          options={options}
        />
      </View>
    </SegmentedCardItem>
  )
}
