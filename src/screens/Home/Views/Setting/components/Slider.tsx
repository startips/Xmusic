
import { memo, useCallback, useEffect } from 'react'

import Slider, { type SliderProps } from '@react-native-community/slider'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { setSettingPagerLocked } from '../pagerLock'

export type {
  SliderProps,
}

export default memo(({ value, minimumValue, maximumValue, onSlidingStart, onSlidingComplete, onValueChange, step }: SliderProps) => {
  const theme = useTheme()

  useEffect(() => {
    return () => {
      setSettingPagerLocked(false)
    }
  }, [])

  const handleSlidingStart = useCallback<NonNullable<SliderProps['onSlidingStart']>>((val) => {
    setSettingPagerLocked(true)
    onSlidingStart?.(val)
  }, [onSlidingStart])

  const handleSlidingComplete = useCallback<NonNullable<SliderProps['onSlidingComplete']>>((val) => {
    setSettingPagerLocked(false)
    onSlidingComplete?.(val)
  }, [onSlidingComplete])

  return (
    <Slider
      value={value}
      style={styles.slider}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      minimumTrackTintColor={theme['m3-primary']}
      maximumTrackTintColor={theme['m3-surface-container-highest']}
      thumbTintColor={theme['m3-primary']}
      onSlidingStart={handleSlidingStart}
      onSlidingComplete={handleSlidingComplete}
      onValueChange={onValueChange}
      step={step}
    />
  )
})


const styles = createStyle({
  slider: {
    flexShrink: 0,
    flexGrow: 1,
    // width: '100%',
    maxWidth: 300,
    height: 40,
    marginTop: -6,
  },
})
