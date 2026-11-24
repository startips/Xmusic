import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { M3Motion } from '@/theme/m3'
import { hapticConfirm, hapticLight } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

export type ExpressiveButtonVariant = 'filled' | 'tonal' | 'secondary' | 'surface'
export type ExpressiveButtonSize = 'sm' | 'md' | 'lg'

export interface ExpressiveButtonProps {
  children: ReactNode
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  variant?: ExpressiveButtonVariant
  size?: ExpressiveButtonSize
  leftRadius?: number
  rightRadius?: number
  pressRadius?: number
  icon?: string
  iconSize?: number
  textSize?: number
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

const SIZE_CONFIG: Record<ExpressiveButtonSize, {
  minHeight: number
  paddingHorizontal: number
  paddingVertical: number
  textSize: number
  iconSize: number
  defaultPressRadius: number
  maxRestingRadius: number
}> = {
  sm: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 5,
    textSize: 12,
    iconSize: 13,
    defaultPressRadius: 8,
    maxRestingRadius: 16,
  },
  md: {
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    textSize: 13.5,
    iconSize: 15,
    defaultPressRadius: 11,
    maxRestingRadius: 19,
  },
  lg: {
    minHeight: 42,
    paddingHorizontal: 20,
    paddingVertical: 10,
    textSize: 14,
    iconSize: 16,
    defaultPressRadius: 13,
    maxRestingRadius: 22,
  },
}

/**
 * Material 3 Expressive button with spring bounce scale and real-time corner-radius morphing.
 */
export const ExpressiveButton = memo(({
  children,
  onPress,
  onLongPress,
  disabled = false,
  variant = 'tonal',
  size = 'md',
  leftRadius,
  rightRadius,
  pressRadius,
  icon,
  iconSize,
  textSize,
  style,
  textStyle,
}: ExpressiveButtonProps) => {
  const theme = useTheme()
  const pressScale = useRef(new Animated.Value(1)).current
  const morphAnim = useRef(new Animated.Value(0)).current

  const cfg = SIZE_CONFIG[size]
  const resolvedPressRadius = pressRadius ?? cfg.defaultPressRadius
  const restLeft = Math.min(leftRadius ?? cfg.maxRestingRadius, cfg.maxRestingRadius)
  const restRight = Math.min(rightRadius ?? cfg.maxRestingRadius, cfg.maxRestingRadius)

  const [bgColor, fgColor] = useMemo(() => {
    switch (variant) {
      case 'filled':
        return [theme['m3-primary'], theme['m3-on-primary']]
      case 'secondary':
        return [theme['m3-secondary-container'], theme['m3-on-secondary-container']]
      case 'surface':
        return [theme['m3-surface-container-highest'], theme['m3-on-surface']]
      case 'tonal':
      default:
        return [theme['m3-primary-container'], theme['m3-on-primary-container']]
    }
  }, [theme, variant])

  const { outerStyle, innerStyle } = useMemo(() => {
    const flat = StyleSheet.flatten(style) ?? {}
    const {
      flex,
      flexGrow,
      flexShrink,
      flexBasis,
      alignSelf,
      margin,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      marginHorizontal,
      marginVertical,
      width,
      ...restInner
    } = flat
    const outerStyle: ViewStyle = {
      flex,
      flexGrow,
      flexShrink,
      flexBasis,
      alignSelf,
      margin,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      marginHorizontal,
      marginVertical,
      width,
    }
    return {
      outerStyle,
      innerStyle: restInner as ViewStyle,
    }
  }, [style])

  const animLeftRadius = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [restLeft, resolvedPressRadius],
    extrapolate: 'clamp',
  })
  const animRightRadius = morphAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [restRight, resolvedPressRadius],
    extrapolate: 'clamp',
  })

  const handlePressIn = () => {
    if (disabled) return
    Animated.spring(pressScale, {
      toValue: 0.94,
      damping: 16,
      stiffness: 360,
      mass: 0.72,
      useNativeDriver: true,
    }).start()
    Animated.spring(morphAnim, {
      toValue: 1,
      ...M3Motion.shapeMorph,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      ...M3Motion.expressiveBounce,
    }).start()
    Animated.spring(morphAnim, {
      toValue: 0,
      ...M3Motion.shapeMorph,
    }).start()
  }

  return (
    <Pressable
      disabled={disabled}
      style={[outerStyle, disabled ? styles.disabled : null]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        if (disabled || !onPress) return
        hapticLight()
        onPress()
      }}
      onLongPress={onLongPress && !disabled ? () => {
        hapticConfirm()
        onLongPress()
      } : undefined}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }], width: outerStyle.width ? '100%' : undefined }}>
        <Animated.View
          style={{
            ...styles.buttonInner,
            minHeight: cfg.minHeight,
            paddingHorizontal: cfg.paddingHorizontal,
            paddingVertical: cfg.paddingVertical,
            backgroundColor: bgColor,
            ...innerStyle,
            borderTopLeftRadius: animLeftRadius,
            borderBottomLeftRadius: animLeftRadius,
            borderTopRightRadius: animRightRadius,
            borderBottomRightRadius: animRightRadius,
          }}
        >
          {icon ? <Icon name={icon} size={iconSize ?? cfg.iconSize} color={fgColor} /> : null}
          {typeof children === 'string' || typeof children === 'number'
            ? (
                <Text
                  size={textSize ?? cfg.textSize}
                  color={fgColor}
                  style={[styles.label, textStyle]}
                  numberOfLines={1}
                >
                  {children}
                </Text>
              )
            : children}
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
})

export interface ExpressiveIconButtonProps {
  icon?: string
  iconSize?: number
  size?: number
  color?: string
  backgroundColor?: string
  active?: boolean
  onPress: () => void
  onLongPress?: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

/**
 * Circular M3 Expressive icon button that morphs from a circle to a squircle when pressed or active.
 */
export const ExpressiveIconButton = memo(({
  icon,
  iconSize = 17,
  size = 36,
  color,
  backgroundColor,
  active = false,
  onPress,
  onLongPress,
  disabled = false,
  style,
  children,
}: ExpressiveIconButtonProps) => {
  const theme = useTheme()
  const [pressed, setPressed] = useState(false)
  const pressScale = useRef(new Animated.Value(1)).current
  const morphAnim = useRef(new Animated.Value(active ? 1 : 0)).current
  const isFirstRenderRef = useRef(true)

  const circleRadius = Math.max(1, size / 2)
  const squircleRadius = Math.max(8, Math.round(size * 0.36))

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }
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

  const resolvedBg = backgroundColor ?? theme['m3-surface-container']
  const resolvedColor = color ?? theme['m3-on-surface']

  return (
    <Pressable
      disabled={disabled}
      hitSlop={4}
      style={[style, disabled ? styles.disabled : null]}
      onPressIn={() => {
        if (disabled) return
        setPressed(true)
        M3Motion.pressSpring(pressScale, 0.92).start()
      }}
      onPressOut={() => {
        setPressed(false)
        Animated.spring(pressScale, {
          toValue: 1,
          ...M3Motion.expressiveBounce,
        }).start()
      }}
      onPress={() => {
        if (disabled) return
        hapticLight()
        onPress()
      }}
      onLongPress={onLongPress && !disabled ? () => {
        hapticConfirm()
        onLongPress()
      } : undefined}
    >
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <Animated.View
          style={{
            ...styles.iconBtnInner,
            width: size,
            height: size,
            backgroundColor: resolvedBg,
            borderRadius: animatedRadius,
          }}
        >
          {children ?? (icon ? <Icon name={icon} size={iconSize} color={resolvedColor} /> : null)}
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
})

const styles = createStyle({
  disabled: {
    opacity: 0.42,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: {
    fontWeight: '600',
  },
  iconBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
})
