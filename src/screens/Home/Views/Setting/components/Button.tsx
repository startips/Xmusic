import { memo, useCallback } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { type BtnProps } from '@/components/common/Button'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'

interface ButtonProps extends BtnProps {
  style?: StyleProp<ViewStyle>
}

export default memo(({ disabled, onPress, style, children }: ButtonProps) => {
  const handlePress = useCallback(() => {
    (onPress as (() => void) | undefined)?.()
  }, [onPress])

  return (
    <ExpressiveButton
      variant="secondary"
      size="md"
      textSize={13.5}
      disabled={disabled ?? false}
      onPress={onPress ? handlePress : undefined}
      style={[{ marginRight: 10 }, style]}
    >
      {children}
    </ExpressiveButton>
  )
})
