import { View } from 'react-native'
import ButtonPrimary from '@/components/common/ButtonPrimary'
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
    <View style={styles.container}>
      <Text>{t('play_detail_setting_timeout_exit')}</Text>
      {statusText ? (
        <View style={styles.content}>
          <Text size={13} color={theme['m3-primary']}>{statusText}</Text>
        </View>
      ) : null}
      <View style={styles.list}>
        <ButtonPrimary onPress={onOpenModal}>
          {isActive ? t('timeout_exit_btn_update') : t('timeout_exit_tip_off')}
        </ButtonPrimary>
      </View>
    </View>
  )
}
