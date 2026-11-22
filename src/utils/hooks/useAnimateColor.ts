import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated } from 'react-native'

const ANIMATION_DURATION = 520

export const useAnimateColor = (color: string) => {
  const anim = useRef(new Animated.Value(1)).current
  const [range, setRange] = useState<[string, string]>([color, color])
  const prevColorRef = useRef(color)

  useEffect(() => {
    if (prevColorRef.current === color) return
    const fromColor = prevColorRef.current
    prevColorRef.current = color
    anim.stopAnimation()
    anim.setValue(0)
    setRange([fromColor, color])
    const timing = Animated.timing(anim, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    })
    timing.start()
    return () => {
      timing.stop()
    }
  }, [anim, color])

  const animColor = useMemo(() => {
    if (range[0] === range[1]) return range[1]
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: range,
    })
  }, [anim, range])

  return [animColor, true] as const
}
