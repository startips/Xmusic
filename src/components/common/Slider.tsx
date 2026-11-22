import { memo } from 'react'

import Slider, { type SliderProps as _SliderProps } from '@react-native-community/slider'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

export type SliderProps = Pick<_SliderProps,
'value'
| 'minimumValue'
| 'maximumValue'
| 'onSlidingStart'
| 'onSlidingComplete'
| 'onValueChange'
| 'step'
| 'disabled'
>

export default memo(({ value, minimumValue = 0, maximumValue = 1, onSlidingStart, onSlidingComplete, onValueChange, step, disabled }: SliderProps) => {
  const theme = useTheme()

  const handleValueChange = (nextValue: number) => {
    if (onValueChange) onValueChange(Math.max(nextValue, minimumValue))
  }

  return (
    <Slider
      value={value}
      disabled={disabled}
      style={styles.slider}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      minimumTrackTintColor={theme['m3-primary']}
      maximumTrackTintColor={theme['m3-surface-container-highest']}
      thumbTintColor={theme['m3-primary']}
      onSlidingStart={onSlidingStart}
      onSlidingComplete={onSlidingComplete}
      onValueChange={handleValueChange}
      step={step}
    />
  )
})

const styles = createStyle({
  slider: {
    flexShrink: 1,
    flexGrow: 1,
    height: 40,
  },
})
