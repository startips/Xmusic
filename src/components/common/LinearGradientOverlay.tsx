import { useMemo } from 'react'
import { Platform, UIManager, View, type ColorValue, type ViewProps, processColor, requireNativeComponent } from 'react-native'

export interface LinearGradientOverlayProps extends ViewProps {
  colors: ColorValue[]
  locations?: number[]
}

interface NativeLinearGradientProps extends ViewProps {
  colors: number[]
  locations?: number[]
}

const COMPONENT_NAME = 'XmusicLinearGradientView'

const NativeLinearGradientView = Platform.OS === 'android' && UIManager.getViewManagerConfig(COMPONENT_NAME) != null
  ? requireNativeComponent<NativeLinearGradientProps>(COMPONENT_NAME)
  : null

/**
 * Hardware-accelerated vertical linear gradient overlay.
 */
export default ({ colors, locations, style, ...props }: LinearGradientOverlayProps) => {
  const nativeColors = useMemo(() => {
    return colors.map(color => {
      const processed = processColor(color)
      return typeof processed === 'number' ? processed : 0
    })
  }, [colors])

  if (!NativeLinearGradientView || nativeColors.length < 2) {
    return <View style={style} {...props} />
  }

  return (
    <NativeLinearGradientView
      colors={nativeColors}
      locations={locations}
      style={style}
      {...props}
    />
  )
}
