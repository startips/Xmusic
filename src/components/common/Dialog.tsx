import { useImperativeHandle, forwardRef, useMemo, useRef } from 'react'
import { View, TouchableHighlight } from 'react-native'

import Modal, { type ModalType } from './Modal'
import { Icon } from '@/components/common/Icon'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { M3Radius } from '@/theme/m3'

const styles = createStyle({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    maxWidth: '90%',
    minWidth: '72%',
    maxHeight: '78%',
    borderRadius: M3Radius.xl,
    overflow: 'hidden',
    elevation: 6,
  },
  header: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 8,
    paddingLeft: 20,
    paddingRight: 14,
  },
  title: {
    flex: 1,
    fontWeight: '600',
    paddingRight: 8,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: M3Radius.full,
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export interface DialogProps {
  onHide?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  title?: string
  children: React.ReactNode | React.ReactNode[]
  height?: number | `${number}%`
}

export interface DialogType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<DialogType, DialogProps>(({
  onHide,
  keyHide = true,
  bgHide = true,
  closeBtn = true,
  title = '',
  children,
  height,
}: DialogProps, ref) => {
  const theme = useTheme()
  const { keyboardShown, keyboardHeight } = useKeyboard()
  const modalRef = useRef<ModalType>(null)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      modalRef.current?.setVisible(visible)
    },
  }))

  const closeBtnComponent = useMemo(() => {
    return closeBtn
      ? <TouchableHighlight style={styles.closeBtn} underlayColor={theme['m3-surface-container-highest']} onPress={() => modalRef.current?.setVisible(false)}>
          <Icon name="close" color={theme['m3-on-surface-variant']} size={12} />
        </TouchableHighlight>
      : null
  }, [closeBtn, theme])

  return (
    <Modal onHide={onHide} keyHide={keyHide} bgHide={bgHide} bgColor={theme['m3-scrim']} ref={modalRef}>
      <View style={{ ...styles.centeredView, paddingBottom: keyboardShown ? keyboardHeight : 0 }}>
        <View style={{ ...styles.modalView, height, backgroundColor: theme['m3-surface-container-high'] }} onStartShouldSetResponder={() => true}>
          {(title || closeBtn)
            ? (
                <View style={styles.header}>
                  <Text style={styles.title} size={16} color={theme['m3-on-surface']} numberOfLines={1}>{title}</Text>
                  {closeBtnComponent}
                </View>
              )
            : null}
          {children}
        </View>
      </View>
    </Modal>
  )
})
