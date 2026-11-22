import { memo, useEffect, useRef, useState } from 'react'
import { Animated, Pressable } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { M3Motion } from '@/theme/m3'
import { hapticConfirm, hapticLight } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

export interface SpringActionButtonProps {
  width: number
  height: number
  borderRadius: number
  topLeftRadius?: number
  bottomLeftRadius?: number
  topRightRadius?: number
  bottomRightRadius?: number
  pressRadius?: number
  backgroundColor: string
  iconName: string
  iconColor: string
  iconSize: number
  onPress: () => void
  onLongPress?: () => void
}

/**
 * M3 Expressive action button with bouncy spring feedback and real-time corner morphing.
 * Supports asymmetric per-corner rest radii for connected wing transport buttons.
 */
export const SpringActionButton = memo(({
  width,
  height,
  borderRadius,
  topLeftRadius,
  bottomLeftRadius,
  topRightRadius,
  bottomRightRadius,
  pressRadius,
  backgroundColor,
  iconName,
  iconColor,
  iconSize,
  onPress,
  onLongPress,
}: SpringActionButtonProps) => {
  const pressScale = useRef(new Animated.Value(1)).current
  const pressMorph = useRef(new Animated.Value(0)).current

  const halfSide = Math.max(1, Math.min(width, height) / 2)
  const restTL = Math.min(topLeftRadius ?? borderRadius, halfSide)
  const restBL = Math.min(bottomLeftRadius ?? borderRadius, halfSide)
  const restTR = Math.min(topRightRadius ?? borderRadius, halfSide)
  const restBR = Math.min(bottomRightRadius ?? borderRadius, halfSide)
  const targetPressRadius = pressRadius ?? Math.round(halfSide * 0.56)

  const animTL = pressMorph.interpolate({ inputRange: [0, 1], outputRange: [restTL, targetPressRadius], extrapolate: 'clamp' })
  const animBL = pressMorph.interpolate({ inputRange: [0, 1], outputRange: [restBL, targetPressRadius], extrapolate: 'clamp' })
  const animTR = pressMorph.interpolate({ inputRange: [0, 1], outputRange: [restTR, targetPressRadius], extrapolate: 'clamp' })
  const animBR = pressMorph.interpolate({ inputRange: [0, 1], outputRange: [restBR, targetPressRadius], extrapolate: 'clamp' })

  return (
    <Pressable
      onPress={() => {
        hapticLight()
        onPress()
      }}
      onLongPress={onLongPress ? () => {
        hapticConfirm()
        onLongPress()
      } : undefined}
      onPressIn={() => {
        M3Motion.pressSpring(pressScale, 0.91).start()
        Animated.spring(pressMorph, { toValue: 1, ...M3Motion.shapeMorph }).start()
      }}
      onPressOut={() => {
        Animated.spring(pressScale, { toValue: 1, ...M3Motion.expressiveBounce }).start()
        Animated.spring(pressMorph, { toValue: 0, ...M3Motion.shapeMorph }).start()
      }}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <Animated.View
          style={{
            ...styles.btn,
            width,
            height,
            backgroundColor,
            borderTopLeftRadius: animTL,
            borderBottomLeftRadius: animBL,
            borderTopRightRadius: animTR,
            borderBottomRightRadius: animBR,
          }}
        >
          <Icon name={iconName} color={iconColor} rawSize={iconSize} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
})

export interface SpringTogglePlayButtonProps {
  width: number
  height: number
  playRadius: number
  pauseRadius: number
  isPlay: boolean
  backgroundColor: string
  iconColor: string
  iconSize: number
  onPress: () => void
}

/**
 * Play/Pause button combining bouncy spring press scaling with Material 3 Expressive
 * corner-radius morphing between pill (paused), rounded square (playing), and squished press shape.
 */
export const SpringTogglePlayButton = memo(({
  width,
  height,
  playRadius,
  pauseRadius,
  isPlay,
  backgroundColor,
  iconColor,
  iconSize,
  onPress,
}: SpringTogglePlayButtonProps) => {
  const [pressed, setPressed] = useState(false)
  const pressScale = useRef(new Animated.Value(1)).current

  const halfSide = Math.max(1, Math.min(width, height) / 2)
  const resolvedPlayRadius = Math.min(playRadius, halfSide)
  const resolvedPauseRadius = Math.min(pauseRadius, halfSide)
  const pressTarget = Math.min(resolvedPlayRadius, Math.max(6, Math.round(halfSide * 0.48)))

  const cornerAnim = useRef(new Animated.Value(isPlay ? resolvedPlayRadius : resolvedPauseRadius)).current

  useEffect(() => {
    const target = pressed ? pressTarget : (isPlay ? resolvedPlayRadius : resolvedPauseRadius)
    Animated.spring(cornerAnim, {
      toValue: target,
      ...M3Motion.shapeMorph,
    }).start()
  }, [isPlay, pressed, pressTarget, resolvedPlayRadius, resolvedPauseRadius, cornerAnim])

  return (
    <Pressable
      onPress={() => {
        hapticLight()
        onPress()
      }}
      onPressIn={() => {
        setPressed(true)
        M3Motion.pressSpring(pressScale, 0.9).start()
      }}
      onPressOut={() => {
        setPressed(false)
        Animated.spring(pressScale, {
          toValue: 1,
          ...M3Motion.expressiveBounce,
        }).start()
      }}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <Animated.View
          style={{
            ...styles.btn,
            width,
            height,
            backgroundColor,
            borderRadius: cornerAnim,
          }}
        >
          <Icon name={isPlay ? 'pause' : 'play'} color={iconColor} rawSize={iconSize} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
})

const styles = createStyle({
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
