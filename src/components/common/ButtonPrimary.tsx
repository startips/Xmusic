import { memo, useCallback } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { type BtnProps } from '@/components/common/Button'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'

export interface ButtonProps extends BtnProps {
  size?: number
  style?: StyleProp<ViewStyle>
}

export default memo(({ disabled, size = 14, onPress, onLongPress, style, children }: ButtonProps) => {
  const handlePress = useCallback(() => {
    (onPress as (() => void) | undefined)?.()
  }, [onPress])

  const handleLongPress = useCallback(() => {
    (onLongPress as (() => void) | undefined)?.()
  }, [onLongPress])

  return (
    <ExpressiveButton
      variant="tonal"
      size="md"
      textSize={size}
      disabled={disabled ?? false}
      onPress={onPress ? handlePress : undefined}
      onLongPress={onLongPress ? handleLongPress : undefined}
      style={[{ marginRight: 10 }, style]}
    >
      {children}
    </ExpressiveButton>
  )
})
