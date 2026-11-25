import { Animated } from 'react-native'
import { SETTING_SCREENS } from '../Main'

export interface SettingPagerMotion {
  pillProgress: Animated.Value
  pillStretch: Animated.Value
  swipeProgress: Animated.Value
  animateToIndex: (targetIndex: number) => void
  syncGestureProgress: (progress: number) => void
  stop: () => void
}

export const createSettingPagerMotion = (initialIndex: number): SettingPagerMotion => {
  const maxIndex = Math.max(0, SETTING_SCREENS.length - 1)
  const clampedInit = Math.max(0, Math.min(maxIndex, initialIndex))

  const pillProgress = new Animated.Value(clampedInit)
  const pillStretch = new Animated.Value(0)
  const swipeProgress = new Animated.Value(clampedInit)

  const animateToIndex = (targetIndex: number) => {
    const clamped = Math.max(0, Math.min(maxIndex, targetIndex))
    swipeProgress.setValue(clamped)
    pillProgress.stopAnimation()
    pillStretch.stopAnimation()
    pillStretch.setValue(0)
    Animated.parallel([
      Animated.spring(pillProgress, {
        toValue: clamped,
        damping: 19,
        stiffness: 290,
        mass: 0.76,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pillStretch, {
          toValue: 1,
          duration: 95,
          useNativeDriver: true,
        }),
        Animated.spring(pillStretch, {
          toValue: 0,
          damping: 16,
          stiffness: 280,
          mass: 0.75,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }

  const syncGestureProgress = (progress: number) => {
    const clamped = Math.max(0, Math.min(maxIndex, progress))
    pillProgress.setValue(clamped)
    swipeProgress.setValue(clamped)
    const frac = clamped - Math.floor(clamped)
    pillStretch.setValue(4 * frac * (1 - frac))
  }

  const stop = () => {
    pillProgress.stopAnimation()
    pillStretch.stopAnimation()
    swipeProgress.stopAnimation()
  }

  return {
    pillProgress,
    pillStretch,
    swipeProgress,
    animateToIndex,
    syncGestureProgress,
    stop,
  }
}
