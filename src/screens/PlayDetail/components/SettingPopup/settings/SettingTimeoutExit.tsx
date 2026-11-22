import { Pressable, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'
import { SegmentedCardItem } from '@/components/common/m3e/SegmentedCard'
import Text from '@/components/common/Text'
import { formatTime } from '@/components/TimeoutExitEditModal'
import { useTimeoutExitTimeInfo } from '@/core/player/timeoutExit'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import styles from './style'

export interface SettingTimeoutExitProps {
  onOpenModal: () => void
}

export default ({ onOpenModal }: SettingTimeoutExitProps) => {
  const t = useI18n()
  const theme = useTheme()
  const exitTimeInfo = useTimeoutExitTimeInfo()
  const isActive = exitTimeInfo.time >= 0 || exitTimeInfo.isPlayedStop

  const statusText = exitTimeInfo.isPlayedStop
    ? t('timeout_exit_btn_wait_tip')
    : exitTimeInfo.time >= 0
      ? t('timeout_exit_tip_on', { time: formatTime(exitTimeInfo.time) })
      : null

  return (
    <SegmentedCardItem index={1} count={2}>
      <Pressable onPress={onOpenModal} style={styles.row}>
        <View style={styles.rowLeft}>
          <View
            style={{
              ...styles.iconBadge,
              backgroundColor: isActive ? theme['m3-primary-container'] : theme['m3-surface-container-high'],
            }}
          >
            <Icon
              name="music_time"
              size={14}
              color={isActive ? theme['m3-primary'] : theme['m3-on-surface-variant']}
            />
          </View>
          <View style={styles.titleCol}>
            <Text size={13.5} color={theme['m3-on-surface']} style={styles.titleText} numberOfLines={1}>
              {t('play_detail_setting_timeout_exit')}
            </Text>
            {statusText
              ? (
                  <Text size={11.5} color={theme['m3-primary']} numberOfLines={1}>
                    {statusText}
                  </Text>
                )
              : null}
          </View>
        </View>
        <ExpressiveButton size="sm" variant={isActive ? 'tonal' : 'secondary'} onPress={onOpenModal}>
          {isActive ? t('timeout_exit_btn_update') : t('timeout_exit_tip_off')}
        </ExpressiveButton>
      </Pressable>
    </SegmentedCardItem>
  )
}
