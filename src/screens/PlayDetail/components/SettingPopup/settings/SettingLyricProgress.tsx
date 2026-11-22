import { Pressable } from 'react-native'
import ExpressiveSwitch from '@/components/common/m3e/ExpressiveSwitch'
import { SegmentedCardItem } from '@/components/common/m3e/SegmentedCard'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { hapticTick } from '@/utils/haptics'
import styles from './style'

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const isShowLyricProgressSetting = useSettingValue('playDetail.isShowLyricProgressSetting')
  const setShowLyricProgressSetting = (showLyricProgressSetting: boolean) => {
    updateSetting({ 'playDetail.isShowLyricProgressSetting': showLyricProgressSetting })
  }

  return (
    <SegmentedCardItem index={1} count={4}>
      <Pressable
        onPress={() => {
          hapticTick()
          setShowLyricProgressSetting(!isShowLyricProgressSetting)
        }}
        style={styles.row}
      >
        <Text size={13.5} color={theme['m3-on-surface']} style={styles.titleText} numberOfLines={1}>
          {t('play_detail_setting_show_lyric_progress_setting')}
        </Text>
        <ExpressiveSwitch value={isShowLyricProgressSetting} onValueChange={setShowLyricProgressSetting} />
      </Pressable>
    </SegmentedCardItem>
  )
}
