import { memo, useRef, type ReactNode } from 'react'
import { Animated, Pressable } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { M3Motion, M3Radius, withAlpha } from '@/theme/m3'
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
 * Circular M3 Expressive action button supporting active theme highlight,
 * spring press animation, and optional custom icon children (e.g. SolidHeartIcon).
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
  const pressScale = useRef(new Animated.Value(1)).current

  const backgroundColor = active
    ? withAlpha(theme['m3-primary-container'], 0.92)
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
      onPressIn={() => { M3Motion.pressSpring(pressScale, 0.9).start() }}
      onPressOut={() => { M3Motion.pressSpring(pressScale, 1).start() }}
    >
      <Animated.View
        style={{
          ...styles.button,
          width: size,
          height: size,
          borderRadius: M3Radius.full,
          backgroundColor,
          transform: [{ scale: pressScale }],
        }}
      >
        {children ?? (icon ? <Icon name={icon} color={iconColor} size={iconSize} /> : null)}
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
