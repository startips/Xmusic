import { type ReactNode } from 'react'
import { scaleSizeW } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import { withAlpha } from '@/theme/m3'
import { HEADER_HEIGHT } from '@/config/constant'
import ActionPillButton from '../../components/ActionPillButton'

export const BTN_WIDTH = scaleSizeW(HEADER_HEIGHT)
export const BTN_ICON_SIZE = 17

export default ({ icon, size, color, active, onPress, onLongPress, children }: {
  icon?: string
  size?: number
  color?: string
  active?: boolean
  onPress: () => void
  onLongPress?: () => void
  children?: ReactNode
}) => {
  const theme = useTheme()
  return (
    <ActionPillButton
      size={34}
      iconSize={size ?? BTN_ICON_SIZE}
      icon={icon}
      color={color}
      active={active}
      inactiveBackgroundColor={withAlpha(theme['m3-surface-container-highest'], 0.72)}
      inactiveIconColor={theme['m3-on-surface']}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {children}
    </ActionPillButton>
  )
}
