import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated } from 'react-native'

export const DEFAULT_DURATION = 520

export const useAnimateNumber = (val: number, duration = DEFAULT_DURATION, useNativeDriver = true) => {
  const anim = useRef(new Animated.Value(val)).current
  const prevValRef = useRef(val)

  useEffect(() => {
    if (prevValRef.current === val) return
    prevValRef.current = val
    anim.stopAnimation()
    const timing = Animated.timing(anim, {
      toValue: val,
      duration,
      useNativeDriver,
    })
    timing.start()
    return () => {
      timing.stop()
    }
  }, [anim, duration, useNativeDriver, val])

  return [anim, true] as const
}

export const useAnimateOnecNumber = (val: number, toVal: number, duration = DEFAULT_DURATION, useNativeDriver = true) => {
  const anim = useMemo(() => new Animated.Value(0), [])
  const [finished, setFinished] = useState(true)

  const animNumber = useMemo(() => anim.interpolate({
    inputRange: [0, 1],
    outputRange: [val, toVal],
  }), [anim, toVal, val])

  useEffect(() => {
    setFinished(false)
    const timing = Animated.timing(anim, {
      toValue: 1,
      duration,
      useNativeDriver,
    })
    timing.start((result) => {
      if (!result.finished) return
      setFinished(true)
    })
    return () => {
      timing.stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [animNumber, finished] as const
}
