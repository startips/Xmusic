import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native'

import Modal, { type ModalType } from './Modal'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { useNavigationBarHeight, useSafeAreaInsets, useStatusbarHeight } from '@/store/common/hook'
import { M3Motion, M3Radius } from '@/theme/m3'
import { windowSizeTools } from '@/utils/windowSizeTools'
import { ExpressiveIconButton } from './m3e/ExpressiveButton'

type PopupPosition = 'top' | 'left' | 'right' | 'bottom'

const getOffscreenOffset = (position: PopupPosition) => {
  const { width, height } = windowSizeTools.getSize()
  switch (position) {
    case 'top':
      return -Math.max(Math.round(height * 0.85), 680)
    case 'left':
      return -Math.max(Math.round(width * 0.82), 520)
    case 'right':
      return Math.max(Math.round(width * 0.82), 520)
    case 'bottom':
    default:
      return Math.max(Math.round(height * 0.85), 680)
  }
}

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
  const safeInsets = useSafeAreaInsets()
  const slideOffset = useRef(new Animated.Value(0)).current
  const scrimOpacity = useMemo(() => slideOffset.interpolate({
    inputRange: [-520, 0, 520],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  }), [slideOffset])

  const modalRef = useRef<ModalType>(null)
  const isOpenRef = useRef(false)
  const isClosingRef = useRef(false)
  const openRafRef = useRef<number | null>(null)

  const cancelPendingOpenRaf = useCallback(() => {
    if (openRafRef.current != null) {
      cancelAnimationFrame(openRafRef.current)
      openRafRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      cancelPendingOpenRaf()
    }
  }, [cancelPendingOpenRaf])

  const handleModalHide = useCallback(() => {
    cancelPendingOpenRaf()
    isOpenRef.current = false
    isClosingRef.current = false
    onHide()
  }, [cancelPendingOpenRaf, onHide])

  const dismissSheet = useCallback(() => {
    cancelPendingOpenRaf()
    if (!isOpenRef.current) {
      isClosingRef.current = false
      modalRef.current?.setVisible(false)
      return
    }
    if (isClosingRef.current) return
    isClosingRef.current = true
    slideOffset.stopAnimation()
    const offVal = getOffscreenOffset(position)
    Animated.timing(slideOffset, {
      toValue: offVal,
      duration: 200,
      easing: Easing.bezier(0.3, 0, 0.8, 0.15),
      useNativeDriver: true,
    }).start(({ finished }) => {
      isClosingRef.current = false
      if (!finished) return
      isOpenRef.current = false
      modalRef.current?.setVisible(false)
      slideOffset.setValue(offVal)
    })
  }, [cancelPendingOpenRaf, position, slideOffset])

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      if (visible) {
        cancelPendingOpenRaf()
        isClosingRef.current = false
        isOpenRef.current = true
        slideOffset.stopAnimation()
        const offVal = getOffscreenOffset(position)
        slideOffset.setValue(offVal)
        modalRef.current?.setVisible(true)
        openRafRef.current = requestAnimationFrame(() => {
          openRafRef.current = null
          Animated.timing(slideOffset, {
            toValue: 0,
            duration: 280,
            easing: Easing.bezier(0.05, 0.7, 0.1, 1.0),
            useNativeDriver: true,
          }).start()
        })
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
      slideOffset.setValue(Math.max(0, gestureState.dy))
    },
    onPanResponderRelease: (_evt, gestureState) => {
      if (gestureState.dy > 72 || gestureState.vy > 0.7) {
        isClosingRef.current = true
        const offY = getOffscreenOffset('bottom')
        Animated.timing(slideOffset, {
          toValue: offY,
          duration: 180,
          easing: Easing.bezier(0.3, 0, 0.8, 0.15),
          useNativeDriver: true,
        }).start(({ finished }) => {
          isClosingRef.current = false
          if (!finished) return
          isOpenRef.current = false
          modalRef.current?.setVisible(false)
          slideOffset.setValue(offY)
        })
      } else {
        Animated.spring(slideOffset, {
          toValue: 0,
          ...M3Motion.spatialFast,
        }).start()
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(slideOffset, {
        toValue: 0,
        ...M3Motion.spatialFast,
      }).start()
    },
  }), [position, slideOffset])

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
            paddingLeft: safeInsets.left,
            paddingRight: safeInsets.right,
            borderBottomLeftRadius: M3Radius.xl,
            borderBottomRightRadius: M3Radius.xl,
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
            paddingLeft: safeInsets.left,
            paddingBottom: Math.max(navBarHeight, safeInsets.bottom),
            borderTopRightRadius: M3Radius.xl,
            borderBottomRightRadius: M3Radius.xl,
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
            paddingRight: safeInsets.right,
            paddingBottom: Math.max(navBarHeight, safeInsets.bottom),
            borderTopLeftRadius: M3Radius.xl,
            borderBottomLeftRadius: M3Radius.xl,
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
            paddingLeft: safeInsets.left,
            paddingRight: safeInsets.right,
            paddingBottom: keyboardShown ? 8 : Math.max(12, Math.max(navBarHeight, safeInsets.bottom) + 8),
            borderTopLeftRadius: M3Radius.xl,
            borderTopRightRadius: M3Radius.xl,
          },
        ] as const
    }
  }, [keyboardShown, navBarHeight, position, safeInsets.bottom, safeInsets.left, safeInsets.right, statusBarHeight])

  const sheetTransform = (position === 'left' || position === 'right')
    ? [{ translateX: slideOffset }]
    : [{ translateY: slideOffset }]

  return (
    <Modal
      animationType="none"
      onHide={handleModalHide}
      onRequestDismiss={dismissSheet}
      keyHide={keyHide}
      bgHide={bgHide}
      statusBarPadding={false}
      bgColor="rgba(0,0,0,0)"
      ref={modalRef}
    >
      <View style={{ ...styles.centeredView, ...centeredViewStyle, paddingBottom: keyboardShown ? keyboardHeight : 0 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme['m3-scrim'], opacity: scrimOpacity },
          ]}
        />
        <Animated.View
          style={{
            ...styles.modalView,
            ...modalViewStyle,
            backgroundColor: theme['m3-surface-container-low'],
            transform: sheetTransform,
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
