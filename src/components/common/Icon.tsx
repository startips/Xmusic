import { createIconSetFromIcoMoon } from 'react-native-vector-icons'
import icoMoonConfig from '@/resources/fonts/selection.json'
import { scaleSizeW } from '@/utils/pixelRatio'
import { memo, type ComponentProps } from 'react'
import { useTheme } from '@/store/theme/hook'
import { type StyleProp, type TextStyle } from 'react-native'

const IcoMoon = createIconSetFromIcoMoon(icoMoonConfig)

type IconType = ReturnType<typeof createIconSetFromIcoMoon>

interface IconProps extends Omit<ComponentProps<IconType>, 'style'> {
  style?: StyleProp<TextStyle>
  rawSize?: number
}

export const Icon = memo(({ size = 15, rawSize, color, style, importantForAccessibility = 'no', accessible = false, ...props }: IconProps) => {
  const theme = useTheme()
  return (
    <IcoMoon
      size={rawSize ?? scaleSizeW(size)}
      color={color ?? theme['c-font']}
      importantForAccessibility={importantForAccessibility}
      accessible={accessible}
      // @ts-expect-error
      style={style}
      {...props}
    />
  )
})
