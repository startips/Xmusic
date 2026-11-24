import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { Animated, Easing, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native'

import Modal, { type ModalType } from './Modal'
import { acquireFluidPause } from './FluidBackground'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { useNavigationBarHeight, useSafeAreaInsets, useStatusbarHeight } from '@/store/common/hook'
import { M3Motion, M3Radius } from '@/theme/m3'
import { windowSizeTools } from '@/utils/windowSizeTools'
import { ExpressiveIconButton } from './m3e/ExpressiveButton'

type PopupPosition = 'top' | 'left' | 'right' | 'bottom'

const getMeasuredOffscreenOffset = (
  position: PopupPosition,
  sheetSize: { width: number, height: number },
) => {
  const { width, height } = windowSizeTools.getSize()
  switch (position) {
    case 'top':
      return -(sheetSize.height > 0 ? Math.round(sheetSize.height + 24) : Math.max(Math.round(height * 0.65), 420))
    case 'left':
      return -(sheetSize.width > 0 ? Math.round(sheetSize.width + 24) : Math.max(Math.round(width * 0.72), 360))
    case 'right':
      return sheetSize.width > 0 ? Math.round(sheetSize.width + 24) : Math.max(Math.round(width * 0.72), 360)
    case 'bottom':
    default:
      return sheetSize.height > 0 ? Math.round(sheetSize.height + 24) : Math.max(Math.round(height * 0.65), 420)
  }
}

const styles = createStyle({
  centeredView: {
    flex: 1,
  },
  modalView: {
    elevation: 0,
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
  const scrimAnim = useRef(new Animated.Value(0)).current

  const modalRef = useRef<ModalType>(null)
  const isOpenRef = useRef(false)
  const isClosingRef = useRef(false)
  const pendingEnterAnimRef = useRef(false)
  const openRafRef = useRef<number | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sheetSizeRef = useRef({ width: 0, height: 0 })
  const fluidPauseReleaseRef = useRef<(() => void) | null>(null)

  const releaseFluidPause = useCallback(() => {
    if (fluidPauseReleaseRef.current) {
      fluidPauseReleaseRef.current()
      fluidPauseReleaseRef.current = null
    }
  }, [])

  const cancelPendingOpenTimers = useCallback(() => {
    if (openRafRef.current != null) {
      cancelAnimationFrame(openRafRef.current)
      openRafRef.current = null
    }
    if (fallbackTimerRef.current != null) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      pendingEnterAnimRef.current = false
      cancelPendingOpenTimers()
      releaseFluidPause()
    }
  }, [cancelPendingOpenTimers, releaseFluidPause])

  const startEnterAnimation = useCallback((exactOffVal: number) => {
    if (!pendingEnterAnimRef.current || !isOpenRef.current || isClosingRef.current) return
    pendingEnterAnimRef.current = false
    cancelPendingOpenTimers()
    slideOffset.stopAnimation()
    scrimAnim.stopAnimation()
    slideOffset.setValue(exactOffVal)
    scrimAnim.setValue(0)
    openRafRef.current = requestAnimationFrame(() => {
      openRafRef.current = null
      if (!isOpenRef.current || isClosingRef.current) return
      Animated.parallel([
        Animated.timing(slideOffset, {
          toValue: 0,
          duration: 260,
          easing: Easing.bezier(0.05, 0.7, 0.1, 1.0),
          useNativeDriver: true,
        }),
        Animated.timing(scrimAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
    })
  }, [cancelPendingOpenTimers, scrimAnim, slideOffset])

  const handleSheetLayout = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (layout.width <= 0 || layout.height <= 0) return
    sheetSizeRef.current = { width: layout.width, height: layout.height }
    if (pendingEnterAnimRef.current) {
      startEnterAnimation(getMeasuredOffscreenOffset(position, sheetSizeRef.current))
    }
  }, [position, startEnterAnimation])

  const handleModalHide = useCallback(() => {
    pendingEnterAnimRef.current = false
    cancelPendingOpenTimers()
    releaseFluidPause()
    isOpenRef.current = false
    isClosingRef.current = false
    onHide()
  }, [cancelPendingOpenTimers, onHide, releaseFluidPause])

  const dismissSheet = useCallback(() => {
    pendingEnterAnimRef.current = false
    cancelPendingOpenTimers()
    if (!isOpenRef.current) {
      isClosingRef.current = false
      releaseFluidPause()
      modalRef.current?.setVisible(false)
      return
    }
    if (isClosingRef.current) return
    isClosingRef.current = true
    slideOffset.stopAnimation()
    scrimAnim.stopAnimation()
    const offVal = getMeasuredOffscreenOffset(position, sheetSizeRef.current)
    Animated.parallel([
      Animated.timing(slideOffset, {
        toValue: offVal,
        duration: 200,
        easing: Easing.bezier(0.3, 0, 0.8, 0.15),
        useNativeDriver: true,
      }),
      Animated.timing(scrimAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      isClosingRef.current = false
      if (!finished) return
      isOpenRef.current = false
      modalRef.current?.setVisible(false)
      slideOffset.setValue(offVal)
      scrimAnim.setValue(0)
    })
  }, [cancelPendingOpenTimers, position, releaseFluidPause, scrimAnim, slideOffset])

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      if (visible) {
        cancelPendingOpenTimers()
        fluidPauseReleaseRef.current ??= acquireFluidPause()
        isClosingRef.current = false
        isOpenRef.current = true
        pendingEnterAnimRef.current = true
        slideOffset.stopAnimation()
        scrimAnim.stopAnimation()
        const offVal = getMeasuredOffscreenOffset(position, sheetSizeRef.current)
        slideOffset.setValue(offVal)
        scrimAnim.setValue(0)
        modalRef.current?.setVisible(true)
        fallbackTimerRef.current = setTimeout(() => {
          fallbackTimerRef.current = null
          startEnterAnimation(getMeasuredOffscreenOffset(position, sheetSizeRef.current))
        }, 48)
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
      const clampedDy = Math.max(0, gestureState.dy)
      slideOffset.setValue(clampedDy)
      const denom = Math.max(sheetSizeRef.current.height || 320, 220)
      scrimAnim.setValue(Math.max(0, Math.min(1, 1 - clampedDy / denom)))
    },
    onPanResponderRelease: (_evt, gestureState) => {
      if (gestureState.dy > 72 || gestureState.vy > 0.7) {
        pendingEnterAnimRef.current = false
        cancelPendingOpenTimers()
        isClosingRef.current = true
        const offY = getMeasuredOffscreenOffset('bottom', sheetSizeRef.current)
        Animated.parallel([
          Animated.timing(slideOffset, {
            toValue: offY,
            duration: 180,
            easing: Easing.bezier(0.3, 0, 0.8, 0.15),
            useNativeDriver: true,
          }),
          Animated.timing(scrimAnim, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          isClosingRef.current = false
          if (!finished) return
          isOpenRef.current = false
          modalRef.current?.setVisible(false)
          slideOffset.setValue(offY)
          scrimAnim.setValue(0)
        })
      } else {
        Animated.parallel([
          Animated.spring(slideOffset, {
            toValue: 0,
            ...M3Motion.spatialFast,
          }),
          Animated.spring(scrimAnim, {
            toValue: 1,
            ...M3Motion.spatialFast,
          }),
        ]).start()
      }
    },
    onPanResponderTerminate: () => {
      Animated.parallel([
        Animated.spring(slideOffset, {
          toValue: 0,
          ...M3Motion.spatialFast,
        }),
        Animated.spring(scrimAnim, {
          toValue: 1,
          ...M3Motion.spatialFast,
        }),
      ]).start()
    },
  }), [cancelPendingOpenTimers, position, scrimAnim, slideOffset])

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
            { backgroundColor: theme['m3-scrim'], opacity: scrimAnim },
          ]}
        />
        <Animated.View
          onLayout={handleSheetLayout}
          renderToHardwareTextureAndroid={true}
          style={{
            ...styles.modalView,
            ...modalViewStyle,
            backgroundColor: theme['m3-surface-container-low'],
            borderColor: theme['m3-outline-variant'],
            borderWidth: 0.5,
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
