import { memo, useEffect, useRef } from 'react'
import { Animated, Pressable } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { M3Motion } from '@/theme/m3'
import { hapticConfirm, hapticLight } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

export interface SpringActionButtonProps {
  width: number
  height: number
  borderRadius: number
  backgroundColor: string
  iconName: string
  iconColor: string
  iconSize: number
  onPress: () => void
  onLongPress?: () => void
}

/**
 * Circular or fixed-radius M3 Expressive button with spring press feedback.
 */
export const SpringActionButton = memo(({
  width,
  height,
  borderRadius,
  backgroundColor,
  iconName,
  iconColor,
  iconSize,
  onPress,
  onLongPress,
}: SpringActionButtonProps) => {
  const pressScale = useRef(new Animated.Value(1)).current

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
      onPressIn={() => { M3Motion.pressSpring(pressScale, 0.9).start() }}
      onPressOut={() => { M3Motion.pressSpring(pressScale, 1).start() }}
    >
      <Animated.View
        style={{
          ...styles.btn,
          width,
          height,
          borderRadius,
          backgroundColor,
          transform: [{ scale: pressScale }],
        }}
      >
        <Icon name={iconName} color={iconColor} rawSize={iconSize} />
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
 * Play/Pause button that combines native spring press scaling with smooth
 * Material 3 Expressive corner-radius morphing between pill (paused) and rounded square (playing).
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
  const pressScale = useRef(new Animated.Value(1)).current
  const morphAnim = useRef(new Animated.Value(isPlay ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(morphAnim, {
      toValue: isPlay ? 1 : 0,
      damping: 18,
      stiffness: 260,
      mass: 0.85,
      useNativeDriver: false,
    }).start()
  }, [isPlay, morphAnim])

  const halfSide = Math.max(1, Math.min(width, height) / 2)
  const resolvedPlayRadius = Math.min(playRadius, halfSide)
  const resolvedPauseRadius = Math.min(pauseRadius, halfSide)
  const minRadius = Math.min(resolvedPlayRadius, resolvedPauseRadius)
  const maxRadius = Math.max(resolvedPlayRadius, resolvedPauseRadius)
  const animatedRadius = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [resolvedPauseRadius, resolvedPlayRadius],
    extrapolate: 'clamp',
  })

  return (
    <Pressable
      onPress={() => {
        hapticLight()
        onPress()
      }}
      onPressIn={() => { M3Motion.pressSpring(pressScale, 0.9).start() }}
      onPressOut={() => { M3Motion.pressSpring(pressScale, 1).start() }}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <Animated.View
          style={{
            ...styles.btn,
            width,
            height,
            backgroundColor,
            borderRadius: minRadius === maxRadius ? minRadius : animatedRadius,
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
