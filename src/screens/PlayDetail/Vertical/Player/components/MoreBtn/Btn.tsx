import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeW } from '@/utils/pixelRatio'
import { M3Radius, withAlpha } from '@/theme/m3'

export const BTN_WIDTH = scaleSizeW(42)
export const BTN_ICON_SIZE = 20

export default ({ icon, color, onPress, onLongPress }: {
  icon: string
  color?: string
  onPress: () => void
  onLongPress?: () => void
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      style={{
        ...styles.cotrolBtn,
        width: BTN_WIDTH,
        height: BTN_WIDTH,
        borderRadius: M3Radius.full,
        backgroundColor: withAlpha(theme['m3-surface-container-high'], 0.7),
      }}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Icon name={icon} color={color ?? theme['m3-on-surface-variant']} size={BTN_ICON_SIZE} />
    </TouchableOpacity>
  )
}

const styles = createStyle({
  cotrolBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
