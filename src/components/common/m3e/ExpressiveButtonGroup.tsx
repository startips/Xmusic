import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { M3Motion, withAlpha } from '@/theme/m3'
import { hapticTick } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

export interface ExpressiveGroupOption<T extends string> {
  id: T
  label: string
  icon?: (active: boolean, color: string) => ReactNode
}

export interface ExpressiveButtonGroupProps<T extends string> {
  options: Array<ExpressiveGroupOption<T>>
  value: T
  onChange: (id: T) => void
  size?: 'sm' | 'md'
  tone?: 'primary' | 'secondary'
  containerColor?: string
  style?: StyleProp<ViewStyle>
}

const GroupItem = <T extends string>({
  option,
  active,
  isFirst,
  isLast,
  size,
  tone,
  onPress,
}: {
  option: ExpressiveGroupOption<T>
  active: boolean
  isFirst: boolean
  isLast: boolean
  size: 'sm' | 'md'
  tone: 'primary' | 'secondary'
  onPress: (id: T) => void
}) => {
  const theme = useTheme()
  const [pressed, setPressed] = useState(false)

  const maxR = size === 'sm' ? 16 : 18
  const outerRest = size === 'sm' ? 14 : 16
  const innerRest = 6
  const innerPress = 11

  const restLeft = active ? maxR : (isFirst ? outerRest : innerRest)
  const restRight = active ? maxR : (isLast ? outerRest : innerRest)
  const targetLeft = pressed && !active ? (isFirst ? outerRest : innerPress) : restLeft
  const targetRight = pressed && !active ? (isLast ? outerRest : innerPress) : restRight
  const targetFlex = active ? (pressed ? 1.2 : 1.14) : (pressed ? 1.08 : 1)

  const flexAnim = useRef(new Animated.Value(targetFlex)).current
  const leftRadiusAnim = useRef(new Animated.Value(targetLeft)).current
  const rightRadiusAnim = useRef(new Animated.Value(targetRight)).current
  const pressScale = useRef(new Animated.Value(1)).current
  const isFirstRenderRef = useRef(true)

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }
    Animated.parallel([
      Animated.spring(flexAnim, { toValue: targetFlex, ...M3Motion.shapeMorph }),
      Animated.spring(leftRadiusAnim, { toValue: targetLeft, ...M3Motion.shapeMorph }),
      Animated.spring(rightRadiusAnim, { toValue: targetRight, ...M3Motion.shapeMorph }),
    ]).start()
  }, [targetFlex, targetLeft, targetRight, flexAnim, leftRadiusAnim, rightRadiusAnim])

  const activeBg = tone === 'primary' ? theme['m3-primary-container'] : theme['m3-secondary-container']
  const activeFg = tone === 'primary' ? theme['m3-on-primary-container'] : theme['m3-on-secondary-container']
  const fgColor = active ? activeFg : theme['m3-on-surface-variant']
  const bgColor = active
    ? activeBg
    : (pressed ? withAlpha(theme['m3-on-surface'], 0.06) : 'transparent')

  return (
    <Animated.View style={{ flex: flexAnim }}>
      <Pressable
        onPressIn={() => {
          setPressed(true)
          M3Motion.pressSpring(pressScale, 0.96).start()
        }}
        onPressOut={() => {
          setPressed(false)
          Animated.spring(pressScale, {
            toValue: 1,
            ...M3Motion.expressiveBounce,
          }).start()
        }}
        onPress={() => { onPress(option.id) }}
      >
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <Animated.View
            style={{
              ...styles.item,
              paddingVertical: size === 'sm' ? 6 : 8,
              paddingHorizontal: size === 'sm' ? 8 : 10,
              backgroundColor: bgColor,
              borderTopLeftRadius: leftRadiusAnim,
              borderBottomLeftRadius: leftRadiusAnim,
              borderTopRightRadius: rightRadiusAnim,
              borderBottomRightRadius: rightRadiusAnim,
            }}
          >
            {option.icon ? option.icon(active, fgColor) : null}
            <Text
              size={size === 'sm' ? 12 : 13}
              numberOfLines={1}
              color={fgColor}
              style={{ fontWeight: active ? '700' : '500' }}
            >
              {option.label}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

/**
 * Material 3 Expressive connected button group with animated active pill morphing and neighbor squish.
 */
function ExpressiveButtonGroupInner<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  tone = 'secondary',
  containerColor,
  style,
}: ExpressiveButtonGroupProps<T>) {
  const theme = useTheme()

  const handlePress = (id: T) => {
    if (id === value) return
    hapticTick()
    onChange(id)
  }

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: containerColor ?? theme['m3-surface-container-high'] },
        style,
      ]}
    >
      {options.map((option, idx) => (
        <GroupItem
          key={option.id}
          option={option}
          active={option.id === value}
          isFirst={idx === 0}
          isLast={idx === options.length - 1}
          size={size}
          tone={tone}
          onPress={handlePress}
        />
      ))}
    </View>
  )
}

export const ExpressiveButtonGroup = memo(ExpressiveButtonGroupInner) as typeof ExpressiveButtonGroupInner

const styles = createStyle({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 3,
    borderRadius: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
})
