import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeW } from '@/utils/pixelRatio'
import { M3Radius, withAlpha } from '@/theme/m3'

import { HEADER_HEIGHT } from '@/config/constant'
export const BTN_WIDTH = scaleSizeW(HEADER_HEIGHT)
export const BTN_ICON_SIZE = 17

export default ({ icon, size, color, onPress, onLongPress }: {
  icon: string
  size?: number
  color?: string
  onPress: () => void
  onLongPress?: () => void
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      style={{
        ...styles.cotrolBtn,
        backgroundColor: withAlpha(theme['m3-surface-container-highest'], 0.72),
      }}
      activeOpacity={0.75}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Icon name={icon} color={color ?? theme['m3-on-surface']} size={size ?? BTN_ICON_SIZE} />
    </TouchableOpacity>
  )
}

const styles = createStyle({
  cotrolBtn: {
    width: 34,
    height: 34,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0,
  },
})
