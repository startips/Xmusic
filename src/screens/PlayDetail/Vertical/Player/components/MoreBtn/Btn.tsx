import { type ReactNode } from 'react'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeW } from '@/utils/pixelRatio'
import { withAlpha } from '@/theme/m3'
import { type HapticType } from '@/utils/haptics'
import ActionPillButton from '../../../../components/ActionPillButton'

export const BTN_WIDTH = scaleSizeW(48)
export const BTN_ICON_SIZE = 22

export default ({ icon, color, active, hapticType, onPress, onLongPress, children }: {
  icon?: string
  color?: string
  active?: boolean
  hapticType?: HapticType | false
  onPress: () => void
  onLongPress?: () => void
  children?: ReactNode
}) => {
  const theme = useTheme()
  return (
    <ActionPillButton
      size={BTN_WIDTH}
      iconSize={BTN_ICON_SIZE}
      icon={icon}
      color={color}
      active={active}
      inactiveBackgroundColor={withAlpha(theme['m3-surface-container-high'], 0.72)}
      inactiveIconColor={theme['m3-on-surface']}
      hapticType={hapticType}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {children}
    </ActionPillButton>
  )
}
