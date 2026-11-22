import { useMemo } from 'react'
import { View } from 'react-native'

import ImageBackground from '@/components/common/ImageBackground'
import FluidBackground from '@/components/common/FluidBackground'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useWindowSize } from '@/utils/hooks'
import SizeView from './SizeView'

interface Props {
  children: React.ReactNode
}

export default ({ children }: Props) => {
  const theme = useTheme()
  const windowSize = useWindowSize()
  const isDynamicBg = useSettingValue('theme.dynamicBg')

  const staticThemeComponent = useMemo(() => (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <ImageBackground
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: windowSize.height,
          width: windowSize.width,
          backgroundColor: theme['c-content-background'],
        }}
        source={theme['bg-image']}
        resizeMode="cover"
      />
      <View style={{ flex: 1, flexDirection: 'column', backgroundColor: theme['c-main-background'] }}>
        {children}
      </View>
    </View>
  ), [children, theme, windowSize.height, windowSize.width])

  const fluidComponent = useMemo(() => (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: theme['m3-background'] }}>
      <FluidBackground
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: windowSize.width,
          height: windowSize.height,
        }}
      />
      <View style={{ flex: 1, flexDirection: 'column' }}>
        {children}
      </View>
    </View>
  ), [children, theme, windowSize.height, windowSize.width])

  return (
    <>
      <SizeView />
      {isDynamicBg ? fluidComponent : staticThemeComponent}
    </>
  )
}
