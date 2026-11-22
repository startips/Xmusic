import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { withAlpha } from '@/theme/m3'
import ActionPillButton from '../../components/ActionPillButton'

export const HEADER_HEIGHT = scaleSizeH(52)

export default ({ icon, color, onPress }: {
  icon: string
  color?: string
  onPress: () => void
}) => {
  const theme = useTheme()
  return (
    <ActionPillButton
      size={38}
      iconSize={17}
      icon={icon}
      color={color}
      inactiveBackgroundColor={withAlpha(theme['m3-surface-container-highest'], 0.78)}
      inactiveIconColor={theme['m3-on-surface']}
      onPress={onPress}
    />
  )
}
