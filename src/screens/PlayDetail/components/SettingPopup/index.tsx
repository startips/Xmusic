import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import Popup, { type PopupType, type PopupProps } from '@/components/common/Popup'
import { SegmentedCardGroup } from '@/components/common/m3e/SegmentedCard'
import TimeoutExitEditModal, { type TimeoutExitEditModalType, useTimeInfo } from '@/components/TimeoutExitEditModal'
import EqualizerModal, { type EqualizerModalType } from '@/components/EqualizerModal'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'

import SettingLyricProgress from './settings/SettingLyricProgress'
import SettingKaraokeLyric from './settings/SettingKaraokeLyric'
import SettingPlaybackRate from './settings/SettingPlaybackRate'
import SettingLrcFontSize from './settings/SettingLrcFontSize'
import SettingLrcAlign from './settings/SettingLrcAlign'
import SettingTimeoutExit from './settings/SettingTimeoutExit'
import SettingEqualizer from './settings/SettingEqualizer'

export interface SettingPopupProps extends Omit<PopupProps, 'children'> {
  direction: 'vertical' | 'horizontal'
}

export interface SettingPopupType {
  show: () => void
}

export default forwardRef<SettingPopupType, SettingPopupProps>(({ direction, ...props }, ref) => {
  const [visible, setVisible] = useState(false)
  const popupRef = useRef<PopupType>(null)
  const timeoutModalRef = useRef<TimeoutExitEditModalType>(null)
  const eqModalRef = useRef<EqualizerModalType>(null)
  const timeInfo = useTimeInfo()
  const t = useI18n()

  useImperativeHandle(ref, () => ({
    show() {
      if (visible) popupRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          popupRef.current?.setVisible(true)
        })
      }
    },
  }))

  const handleOpenTimeoutModal = () => {
    popupRef.current?.setVisible(false)
    setTimeout(() => {
      timeoutModalRef.current?.show()
    }, 80)
  }

  const handleOpenEqModal = () => {
    popupRef.current?.setVisible(false)
    setTimeout(() => {
      eqModalRef.current?.show()
    }, 80)
  }

  return (
    <>
      {visible
        ? (
            <Popup ref={popupRef} title={t('play_detail_setting_title')} {...props}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetBody} onStartShouldSetResponder={() => true}>
                  <SegmentedCardGroup>
                    <SettingEqualizer onOpenModal={handleOpenEqModal} />
                    <SettingTimeoutExit onOpenModal={handleOpenTimeoutModal} />
                  </SegmentedCardGroup>

                  <SegmentedCardGroup>
                    <SettingPlaybackRate />
                  </SegmentedCardGroup>

                  <SegmentedCardGroup>
                    <SettingKaraokeLyric />
                    <SettingLyricProgress />
                    <SettingLrcFontSize direction={direction} />
                    <SettingLrcAlign />
                  </SegmentedCardGroup>
                </View>
              </ScrollView>
            </Popup>
          )
        : null}
      <TimeoutExitEditModal ref={timeoutModalRef} timeInfo={timeInfo} />
      <EqualizerModal ref={eqModalRef} position={props.position} />
    </>
  )
})

const styles = createStyle({
  sheetBody: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 10,
    gap: 10,
  },
})
