import { type ReactNode } from 'react'
import { scaleSizeW } from '@/utils/pixelRatio'
import ActionPillButton from '../../components/ActionPillButton'

export const BTN_WIDTH = scaleSizeW(34)
export const BTN_ICON_SIZE = 18

export default ({ icon, color, active, onPress, onLongPress, children }: {
  icon?: string
  color?: string
  active?: boolean
  onPress: () => void
  onLongPress?: () => void
  children?: ReactNode
}) => {
  return (
    <ActionPillButton
      size={BTN_WIDTH}
      iconSize={BTN_ICON_SIZE}
      icon={icon}
      color={color}
      active={active}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {children}
    </ActionPillButton>
  )
}
