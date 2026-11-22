import { memo, useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'

import Section from '../../components/Section'
import SubTitle from '../../components/SubTitle'
import CheckBoxItem from '../../components/CheckBoxItem'
import Button from '../../components/Button'
import EqualizerModal, { type EqualizerModalType } from '@/components/EqualizerModal'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'
import { hapticConfirm, hapticTick } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

const CROSSFADE_OPTIONS = [0, 1, 2, 3, 5] as const

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const eqModalRef = useRef<EqualizerModalType>(null)

  const eqEnabled = useSettingValue('player.eqEnabled')
  const eqPreset = useSettingValue('player.eqPreset')
  const crossfadeDuration = useSettingValue('player.crossfadeDuration')
  const enableHaptics = useSettingValue('common.enableHaptics')

  return (
    <Section title={t('setting_audio_enhance')}>
      <SubTitle title={t('eq_title')}>
        <View style={styles.eqRow}>
          <Button onPress={() => { eqModalRef.current?.show() }}>
            {t('eq_open_btn')}
          </Button>
          <Text size={13} color={eqEnabled ? theme['m3-primary'] : theme['m3-on-surface-variant']}>
            {eqEnabled ? `${t('eq_on')} · ${t(`eq_preset_${eqPreset}`)}` : t('eq_off')}
          </Text>
        </View>
      </SubTitle>

      <SubTitle title={t('setting_play_crossfade')}>
        <View
          style={{
            ...styles.segmented,
            backgroundColor: theme['m3-surface-container-low'],
            borderColor: theme['m3-outline-variant'],
          }}
        >
          {CROSSFADE_OPTIONS.map((sec) => {
            const active = crossfadeDuration == sec
            return (
              <TouchableOpacity
                key={sec}
                activeOpacity={0.75}
                style={{
                  ...styles.segBtn,
                  backgroundColor: active ? theme['m3-secondary-container'] : 'transparent',
                }}
                onPress={() => {
                  hapticTick()
                  updateSetting({ 'player.crossfadeDuration': sec })
                }}
              >
                <Text
                  size={12.5}
                  style={{ fontWeight: active ? '700' : '500' }}
                  color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
                >
                  {sec == 0 ? t('eq_off') : `${sec}s`}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </SubTitle>

      <CheckBoxItem
        check={enableHaptics}
        label={t('setting_common_enable_haptics')}
        onChange={(val) => {
          updateSetting({ 'common.enableHaptics': val })
          if (val) hapticConfirm()
        }}
      />

      <EqualizerModal ref={eqModalRef} />
    </Section>
  )
})

const styles = createStyle({
  eqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: M3Radius.full,
    borderWidth: 0.6,
    padding: 3,
    gap: 4,
    maxWidth: 360,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: M3Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
