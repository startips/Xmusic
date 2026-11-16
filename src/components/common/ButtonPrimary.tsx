import { memo } from 'react'

import Button, { type BtnProps } from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { M3Radius } from '@/theme/m3'

export interface ButtonProps extends BtnProps {
  size?: number
}

export default memo(({ disabled, size = 14, onPress, children }: ButtonProps) => {
  const theme = useTheme()

  return (
    <Button
      style={{ ...styles.button, backgroundColor: theme['m3-primary-container'] }}
      onPress={onPress}
      disabled={disabled}
    >
      <Text size={size} color={theme['m3-on-primary-container']} style={styles.label}>{children}</Text>
    </Button>
  )
})

const styles = createStyle({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: M3Radius.full,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
  },
})
