import { memo } from 'react'

import Button, { type BtnProps } from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { M3Radius } from '@/theme/m3'

type ButtonProps = BtnProps

export default memo(({ disabled, onPress, children }: ButtonProps) => {
  const theme = useTheme()

  return (
    <Button style={{ ...styles.button, backgroundColor: theme['m3-secondary-container'] }} onPress={onPress} disabled={disabled}>
      <Text size={13.5} style={styles.label} color={theme['m3-on-secondary-container']}>{children}</Text>
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
