import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import Popup, { type PopupType, type PopupProps } from '@/components/common/Popup'
import TimeoutExitEditModal, { type TimeoutExitEditModalType, useTimeInfo } from '@/components/TimeoutExitEditModal'
import EqualizerModal, { type EqualizerModalType } from '@/components/EqualizerModal'
import { useI18n } from '@/lang'

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
  // console.log('render import export')
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
            <ScrollView>
              <View onStartShouldSetResponder={() => true}>
                <SettingEqualizer onOpenModal={handleOpenEqModal} />
                <SettingKaraokeLyric />
                <SettingLyricProgress />
                <SettingTimeoutExit onOpenModal={handleOpenTimeoutModal} />
                <SettingPlaybackRate />
                <SettingLrcFontSize direction={direction} />
                <SettingLrcAlign />
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
