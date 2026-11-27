import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
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
import SettingVisualizer from './settings/SettingVisualizer'

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
  const pendingModalRef = useRef<'eq' | 'timeout' | null>(null)
  const timeInfo = useTimeInfo()
  const t = useI18n()

  useImperativeHandle(ref, () => ({
    show() {
      pendingModalRef.current = null
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
    pendingModalRef.current = 'timeout'
    popupRef.current?.setVisible(false)
  }

  const handleOpenEqModal = () => {
    pendingModalRef.current = 'eq'
    popupRef.current?.setVisible(false)
  }

  const { onHide: propOnHide } = props
  const handlePopupHide = useCallback(() => {
    const next = pendingModalRef.current
    pendingModalRef.current = null
    setVisible(false)
    propOnHide?.()
    if (next === 'eq') {
      requestAnimationFrame(() => {
        eqModalRef.current?.show()
      })
    } else if (next === 'timeout') {
      requestAnimationFrame(() => {
        timeoutModalRef.current?.show()
      })
    }
  }, [propOnHide])

  return (
    <>
      {visible
        ? (
            <Popup ref={popupRef} title={t('play_detail_setting_title')} {...props} onHide={handlePopupHide}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetBody} onStartShouldSetResponder={() => true}>
                  <SegmentedCardGroup>
                    <SettingEqualizer onOpenModal={handleOpenEqModal} />
                    <SettingTimeoutExit onOpenModal={handleOpenTimeoutModal} />
                  </SegmentedCardGroup>

                  <SegmentedCardGroup>
                    <SettingPlaybackRate />
                    <SettingVisualizer />
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
