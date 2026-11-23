import { memo, useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { M3Motion, M3Radius, withAlpha } from '@/theme/m3'
import { hapticTick } from '@/utils/haptics'

export interface ExpressiveSwitchProps {
  value: boolean
  onValueChange: (val: boolean) => void
  disabled?: boolean
}

/**
 * Material 3 Expressive stadium switch with spring-morphing thumb dimensions and pure View checkmark.
 */
export default memo(({ value, onValueChange, disabled = false }: ExpressiveSwitchProps) => {
  const theme = useTheme()
  const [pressed, setPressed] = useState(false)

  const thumbW = useRef(new Animated.Value(value ? 20 : 14)).current
  const thumbH = useRef(new Animated.Value(value ? 20 : 14)).current
  const thumbX = useRef(new Animated.Value(value ? 22 : 5)).current

  useEffect(() => {
    const targetW = pressed ? (value ? 23 : 21) : (value ? 20 : 14)
    const targetH = pressed ? (value ? 20 : 17) : (value ? 20 : 14)
    const targetX = pressed ? (value ? 19 : 4) : (value ? 22 : 5)

    Animated.parallel([
      Animated.spring(thumbW, { toValue: targetW, ...M3Motion.shapeMorph }),
      Animated.spring(thumbH, { toValue: targetH, ...M3Motion.shapeMorph }),
      Animated.spring(thumbX, { toValue: targetX, ...M3Motion.shapeMorph }),
    ]).start()
  }, [value, pressed, thumbW, thumbH, thumbX])

  const trackBg = value ? theme['m3-primary'] : theme['m3-surface-container-highest']
  const trackBorder = value ? theme['m3-primary'] : withAlpha(theme['m3-on-surface-variant'], 0.45)
  const thumbBg = value ? theme['m3-on-primary'] : withAlpha(theme['m3-on-surface-variant'], 0.85)

  return (
    <Pressable
      disabled={disabled}
      hitSlop={6}
      onPressIn={() => { setPressed(true) }}
      onPressOut={() => { setPressed(false) }}
      onPress={() => {
        if (disabled) return
        hapticTick()
        onValueChange(!value)
      }}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <View
        style={{
          ...styles.track,
          backgroundColor: trackBg,
          borderColor: trackBorder,
        }}
      >
        <Animated.View
          style={{
            ...styles.thumb,
            backgroundColor: thumbBg,
            width: thumbW,
            height: thumbH,
            left: thumbX,
          }}
        >
          {value
            ? <View style={{ ...styles.checkMark, borderColor: theme['m3-primary'] }} />
            : null}
        </Animated.View>
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: M3Radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    width: 8.5,
    height: 5,
    borderLeftWidth: 1.8,
    borderBottomWidth: 1.8,
    transform: [{ rotate: '-45deg' }, { translateY: -0.8 }],
  },
})
