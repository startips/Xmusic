import { View } from 'react-native'
import ButtonPrimary from '@/components/common/ButtonPrimary'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import styles from './style'

export interface SettingEqualizerProps {
  onOpenModal: () => void
}

export default ({ onOpenModal }: SettingEqualizerProps) => {
  const t = useI18n()
  const theme = useTheme()
  const eqEnabled = useSettingValue('player.eqEnabled')
  const eqPreset = useSettingValue('player.eqPreset')

  return (
    <View style={styles.container}>
      <Text>{t('eq_title')}</Text>
      {eqEnabled
        ? (
            <View style={styles.content}>
              <Text size={13} color={theme['m3-primary']}>
                {t('eq_on')} · {t(`eq_preset_${eqPreset}`)}
              </Text>
            </View>
          )
        : null}
      <View style={styles.list}>
        <ButtonPrimary onPress={onOpenModal}>
          {t('eq_open_btn')}
        </ButtonPrimary>
      </View>
    </View>
  )
}
