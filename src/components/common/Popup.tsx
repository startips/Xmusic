import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'

import Modal, { type ModalType } from './Modal'
import { Icon } from '@/components/common/Icon'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { useStatusbarHeight } from '@/store/common/hook'
import { M3Radius } from '@/theme/m3'

const styles = createStyle({
  centeredView: {
    flex: 1,
  },
  modalView: {
    elevation: 8,
    flexGrow: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  dragHandleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: M3Radius.full,
  },
  header: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
    fontWeight: '600',
    paddingRight: 8,
  },
  closeBtn: {
    height: 32,
    width: 32,
    borderRadius: M3Radius.full,
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export interface PopupProps {
  onHide?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  position?: 'top' | 'left' | 'right' | 'bottom'
  title?: string
  children: React.ReactNode
}

export interface PopupType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<PopupType, PopupProps>(({
  onHide = () => {},
  keyHide = true,
  bgHide = true,
  closeBtn = true,
  position = 'bottom',
  title = '',
  children,
}: PopupProps, ref) => {
  const theme = useTheme()
  const { keyboardShown, keyboardHeight } = useKeyboard()
  const statusBarHeight = useStatusbarHeight()

  const modalRef = useRef<ModalType>(null)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      modalRef.current?.setVisible(visible)
    },
  }))

  const closeBtnComponent = useMemo(() => closeBtn
    ? <TouchableOpacity style={{ ...styles.closeBtn, backgroundColor: theme['m3-surface-container-high'] }} onPress={() => modalRef.current?.setVisible(false)}>
        <Icon name="close" style={{ color: theme['m3-on-surface-variant'] }} size={12} />
      </TouchableOpacity>
    : null, [closeBtn, theme])

  const [centeredViewStyle, modalViewStyle] = useMemo(() => {
    switch (position) {
      case 'top':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            justifyContent: 'flex-start',
          },
          {
            width: '100%',
            maxHeight: '78%',
            minHeight: '20%',
            // backgroundColor: 'white',
          },
        ] as const
      case 'left':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            flexDirection: 'row',
            justifyContent: 'flex-start',
          },
          {
            minWidth: '45%',
            maxWidth: '78%',
            height: '100%',
            paddingTop: statusBarHeight,
            // backgroundColor: 'white',
          },
        ] as const
      case 'right':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            flexDirection: 'row',
            justifyContent: 'flex-end',
          },
          {
            minWidth: '45%',
            maxWidth: '78%',
            height: '100%',
            paddingTop: statusBarHeight,
            // backgroundColor: 'white',
          },
        ] as const
      case 'bottom':
      default:
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            justifyContent: 'flex-end',
          },
          {
            width: '100%',
            maxHeight: '78%',
            minHeight: '20%',
            borderTopLeftRadius: M3Radius.xl,
            borderTopRightRadius: M3Radius.xl,
          },
        ] as const
    }
  }, [position, statusBarHeight])

  return (
    <Modal onHide={onHide} keyHide={keyHide} bgHide={bgHide} bgColor={theme['m3-scrim']} ref={modalRef}>
      <View style={{ ...styles.centeredView, ...centeredViewStyle, paddingBottom: keyboardShown ? keyboardHeight : 0 }}>
        <View style={{ ...styles.modalView, ...modalViewStyle, backgroundColor: theme['m3-surface-container-low'] }} onStartShouldSetResponder={() => true}>
          {position == 'bottom'
            ? (
                <View style={styles.dragHandleWrap}>
                  <View style={{ ...styles.dragHandle, backgroundColor: theme['m3-outline'] }} />
                </View>
              )
            : null}
          <View style={styles.header}>
            <Text size={16} color={theme['m3-on-surface']} style={styles.title} numberOfLines={1}>{title}</Text>
            {closeBtnComponent}
          </View>
          {children}
        </View>
      </View>
    </Modal>
  )
})
