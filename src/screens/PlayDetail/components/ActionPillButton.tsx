import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { M3Motion, withAlpha } from '@/theme/m3'
import { hapticConfirm, triggerHaptic, type HapticType } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

export interface ActionPillButtonProps {
  size: number
  iconSize: number
  icon?: string
  color?: string
  active?: boolean
  inactiveBackgroundColor?: string
  inactiveIconColor?: string
  hapticType?: HapticType | false
  onPress: () => void
  onLongPress?: () => void
  children?: ReactNode
}

/**
 * Circular M3 Expressive action button with active theme highlight,
 * bouncy spring press animation, and circle <-> squircle corner morphing.
 */
export default memo(({
  size,
  iconSize,
  icon,
  color,
  active = false,
  inactiveBackgroundColor,
  inactiveIconColor,
  hapticType = 'light',
  onPress,
  onLongPress,
  children,
}: ActionPillButtonProps) => {
  const theme = useTheme()
  const [pressed, setPressed] = useState(false)
  const pressScale = useRef(new Animated.Value(1)).current
  const morphAnim = useRef(new Animated.Value(active ? 1 : 0)).current

  const circleRadius = Math.max(1, size / 2)
  const squircleRadius = Math.max(6, Math.round(size * 0.3))

  useEffect(() => {
    Animated.spring(morphAnim, {
      toValue: active || pressed ? 1 : 0,
      ...M3Motion.shapeMorph,
    }).start()
  }, [active, pressed, morphAnim])

  const animatedRadius = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circleRadius, squircleRadius],
    extrapolate: 'clamp',
  })

  const backgroundColor = active
    ? withAlpha(theme['m3-primary-container'], 0.94)
    : pressed && inactiveBackgroundColor === 'transparent'
      ? withAlpha(theme['m3-on-surface'], 0.1)
      : (inactiveBackgroundColor ?? withAlpha(theme['m3-surface-container-high'], 0.72))

  const iconColor = color ?? (
    active
      ? theme['m3-primary']
      : (inactiveIconColor ?? theme['m3-on-surface-variant'])
  )

  return (
    <Pressable
      onPress={() => {
        if (hapticType) triggerHaptic(hapticType)
        onPress()
      }}
      onLongPress={onLongPress ? () => {
        hapticConfirm()
        onLongPress()
      } : undefined}
      onPressIn={() => {
        setPressed(true)
        M3Motion.pressSpring(pressScale, 0.88).start()
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
            ...styles.button,
            width: size,
            height: size,
            borderRadius: animatedRadius,
            backgroundColor,
          }}
        >
          {children ?? (icon ? <Icon name={icon} color={iconColor} size={iconSize} /> : null)}
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
})

const styles = createStyle({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0,
  },
})
