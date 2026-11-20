import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import { M3Radius, withAlpha } from '@/theme/m3'

export const HEADER_HEIGHT = scaleSizeH(52)

export default ({ icon, color, onPress }: {
  icon: string
  color?: string
  onPress: () => void
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        ...styles.button,
        backgroundColor: withAlpha(theme['m3-surface-container-highest'], 0.8),
      }}
    >
      <Icon name={icon} color={color ?? theme['m3-on-surface']} size={17} />
    </TouchableOpacity>
  )
}

const styles = createStyle({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 38,
    height: 38,
    borderRadius: M3Radius.full,
    flex: 0,
  },
})
