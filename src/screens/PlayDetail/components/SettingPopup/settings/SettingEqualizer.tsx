import { Pressable, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'
import { SegmentedCardItem } from '@/components/common/m3e/SegmentedCard'
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
    <SegmentedCardItem index={0} count={2}>
      <Pressable onPress={onOpenModal} style={styles.row}>
        <View style={styles.rowLeft}>
          <View
            style={{
              ...styles.iconBadge,
              backgroundColor: eqEnabled ? theme['m3-primary-container'] : theme['m3-surface-container-high'],
            }}
          >
            <Icon
              name="slider"
              size={14}
              color={eqEnabled ? theme['m3-primary'] : theme['m3-on-surface-variant']}
            />
          </View>
          <View style={styles.titleCol}>
            <Text size={13.5} color={theme['m3-on-surface']} style={styles.titleText} numberOfLines={1}>
              {t('eq_title')}
            </Text>
            {eqEnabled
              ? (
                  <Text size={11.5} color={theme['m3-primary']} numberOfLines={1}>
                    {t('eq_on')} · {t(`eq_preset_${eqPreset}`)}
                  </Text>
                )
              : null}
          </View>
        </View>
        <ExpressiveButton size="sm" variant={eqEnabled ? 'tonal' : 'secondary'} onPress={onOpenModal}>
          {t('eq_open_btn')}
        </ExpressiveButton>
      </Pressable>
    </SegmentedCardItem>
  )
}
