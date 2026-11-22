import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native'

import Modal, { type ModalType } from './Modal'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { useNavigationBarHeight, useStatusbarHeight } from '@/store/common/hook'
import { M3Motion, M3Radius } from '@/theme/m3'
import { windowSizeTools } from '@/utils/windowSizeTools'
import { ExpressiveIconButton } from './m3e/ExpressiveButton'

const getSheetOffscreenY = () => Math.max(Math.round(windowSizeTools.getSize().height * 0.85), 680)

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
    fontWeight: '700',
    paddingRight: 8,
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
  const navBarHeight = useNavigationBarHeight()
  const dragY = useRef(new Animated.Value(0)).current
  const scrimOpacity = useMemo(() => dragY.interpolate({
    inputRange: [0, 520],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  }), [dragY])

  const modalRef = useRef<ModalType>(null)
  const isOpenRef = useRef(false)
  const isClosingRef = useRef(false)

  const handleModalHide = useCallback(() => {
    isOpenRef.current = false
    isClosingRef.current = false
    onHide()
  }, [onHide])

  const dismissSheet = useCallback(() => {
    if (position === 'bottom' && isOpenRef.current) {
      if (isClosingRef.current) return
      isClosingRef.current = true
      const offY = getSheetOffscreenY()
      Animated.timing(dragY, {
        toValue: offY,
        duration: 200,
        easing: Easing.bezier(0.3, 0, 0.8, 0.15),
        useNativeDriver: true,
      }).start(({ finished }) => {
        isClosingRef.current = false
        if (!finished) return
        isOpenRef.current = false
        modalRef.current?.setVisible(false)
        dragY.setValue(offY)
      })
    } else {
      isClosingRef.current = false
      isOpenRef.current = false
      modalRef.current?.setVisible(false)
    }
  }, [dragY, position])

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      if (visible) {
        isClosingRef.current = false
        isOpenRef.current = true
        dragY.stopAnimation()
        if (position === 'bottom') {
          const offY = getSheetOffscreenY()
          dragY.setValue(offY)
          modalRef.current?.setVisible(true)
          requestAnimationFrame(() => {
            Animated.timing(dragY, {
              toValue: 0,
              duration: 280,
              easing: Easing.bezier(0.05, 0.7, 0.1, 1.0),
              useNativeDriver: true,
            }).start()
          })
        } else {
          dragY.setValue(0)
          modalRef.current?.setVisible(true)
        }
      } else {
        dismissSheet()
      }
    },
  }))

  const sheetPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => position === 'bottom',
    onMoveShouldSetPanResponder: (_evt, gestureState) =>
      position === 'bottom' && gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
    onPanResponderMove: (_evt, gestureState) => {
      dragY.setValue(Math.max(0, gestureState.dy))
    },
    onPanResponderRelease: (_evt, gestureState) => {
      if (gestureState.dy > 72 || gestureState.vy > 0.7) {
        isClosingRef.current = true
        const offY = getSheetOffscreenY()
        Animated.timing(dragY, {
          toValue: offY,
          duration: 180,
          easing: Easing.bezier(0.3, 0, 0.8, 0.15),
          useNativeDriver: true,
        }).start(({ finished }) => {
          isClosingRef.current = false
          if (!finished) return
          isOpenRef.current = false
          modalRef.current?.setVisible(false)
          dragY.setValue(offY)
        })
      } else {
        Animated.spring(dragY, {
          toValue: 0,
          ...M3Motion.spatialFast,
        }).start()
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, {
        toValue: 0,
        ...M3Motion.spatialFast,
      }).start()
    },
  }), [dragY, position])

  const closeBtnComponent = useMemo(() => closeBtn
    ? <ExpressiveIconButton
        size={32}
        icon="close"
        iconSize={11}
        backgroundColor={theme['m3-surface-container-high']}
        color={theme['m3-on-surface-variant']}
        onPress={dismissSheet}
      />
    : null, [closeBtn, dismissSheet, theme])

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
            paddingTop: statusBarHeight,
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
            paddingBottom: navBarHeight,
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
            paddingBottom: navBarHeight,
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
            maxHeight: '82%',
            minHeight: '20%',
            paddingBottom: keyboardShown ? 8 : Math.max(12, navBarHeight + 8),
            borderTopLeftRadius: M3Radius.xl,
            borderTopRightRadius: M3Radius.xl,
          },
        ] as const
    }
  }, [keyboardShown, navBarHeight, position, statusBarHeight])

  return (
    <Modal
      animationType={position === 'bottom' ? 'none' : 'fade'}
      onHide={handleModalHide}
      onRequestDismiss={position === 'bottom' ? dismissSheet : undefined}
      keyHide={keyHide}
      bgHide={bgHide}
      statusBarPadding={false}
      bgColor={position === 'bottom' ? 'rgba(0,0,0,0)' : theme['m3-scrim']}
      ref={modalRef}
    >
      <View style={{ ...styles.centeredView, ...centeredViewStyle, paddingBottom: keyboardShown ? keyboardHeight : 0 }}>
        {position === 'bottom'
          ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: theme['m3-scrim'], opacity: scrimOpacity },
                ]}
              />
            )
          : null}
        <Animated.View
          style={{
            ...styles.modalView,
            ...modalViewStyle,
            backgroundColor: theme['m3-surface-container-low'],
            transform: position === 'bottom' ? [{ translateY: dragY }] : undefined,
          }}
          onStartShouldSetResponder={() => true}
        >
          {position == 'bottom'
            ? (
                <View style={styles.dragHandleWrap} {...sheetPanResponder.panHandlers}>
                  <View style={{ ...styles.dragHandle, backgroundColor: theme['m3-outline'] }} />
                </View>
              )
            : null}
          <View style={styles.header} {...(position === 'bottom' ? sheetPanResponder.panHandlers : {})}>
            <Text size={15.5} color={theme['m3-on-surface']} style={styles.title} numberOfLines={1}>{title}</Text>
            {closeBtnComponent}
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  )
})
