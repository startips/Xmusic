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
  const isShowKaraokeLyric = useSettingValue('playDetail.isShowKaraokeLyric')
  const setShowKaraokeLyric = (val: boolean) => {
    updateSetting({ 'playDetail.isShowKaraokeLyric': val })
  }

  return (
    <SegmentedCardItem index={0} count={4}>
      <Pressable
        onPress={() => {
          hapticTick()
          setShowKaraokeLyric(!isShowKaraokeLyric)
        }}
        style={styles.row}
      >
        <Text size={13.5} color={theme['m3-on-surface']} style={styles.titleText} numberOfLines={1}>
          {t('play_detail_setting_show_karaoke_lyric')}
        </Text>
        <ExpressiveSwitch value={isShowKaraokeLyric} onValueChange={setShowKaraokeLyric} />
      </Pressable>
    </SegmentedCardItem>
  )
}
