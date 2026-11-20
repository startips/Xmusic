import { memo } from 'react'
import { Platform, UIManager, View, type ColorValue, type StyleProp, type ViewStyle, requireNativeComponent } from 'react-native'
import { scaleSizeW } from '@/utils/pixelRatio'
import { Icon } from './Icon'

interface NativeSolidHeartProps {
  color?: ColorValue
  style?: StyleProp<ViewStyle>
}

const COMPONENT_NAME = 'XmusicSolidHeartView'

const NativeSolidHeartView = Platform.OS === 'android' && UIManager.getViewManagerConfig(COMPONENT_NAME) != null
  ? requireNativeComponent<NativeSolidHeartProps>(COMPONENT_NAME)
  : null

export interface SolidHeartIconProps {
  size?: number
  rawSize?: number
  color?: string
}

/**
 * Crisp filled Material heart vector tinted with the active theme color.
 */
export default memo(({ size = 15, rawSize, color }: SolidHeartIconProps) => {
  const side = rawSize ?? scaleSizeW(size)
  if (!NativeSolidHeartView) {
    return <Icon name="love" size={size} rawSize={rawSize} color={color} />
  }
  return (
    <View pointerEvents="none" style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}>
      <NativeSolidHeartView color={color} style={{ width: side, height: side }} />
    </View>
  )
})
