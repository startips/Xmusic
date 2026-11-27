import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import ImageBackground from '@/components/common/ImageBackground'
import FluidBackground from '@/components/common/FluidBackground'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useSafeAreaInsets } from '@/store/common/hook'
import SizeView from './SizeView'

interface Props {
  children: React.ReactNode
  horizontalSafeArea?: boolean
  audioReactive?: boolean
}

export default ({ children, horizontalSafeArea = true, audioReactive = false }: Props) => {
  const theme = useTheme()
  const isDynamicBg = useSettingValue('theme.dynamicBg')
  const safeInsets = useSafeAreaInsets()
  const padLeft = horizontalSafeArea ? safeInsets.left : 0
  const padRight = horizontalSafeArea ? safeInsets.right : 0

  const staticThemeComponent = useMemo(() => (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <ImageBackground
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme['c-content-background'] },
        ]}
        source={theme['bg-image']}
        resizeMode="cover"
      />
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          backgroundColor: theme['c-main-background'],
          paddingLeft: padLeft,
          paddingRight: padRight,
        }}
      >
        {children}
      </View>
    </View>
  ), [children, padLeft, padRight, theme])

  const fluidComponent = useMemo(() => (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: theme['m3-background'] }}>
      <FluidBackground audioReactive={audioReactive} style={StyleSheet.absoluteFill} />
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          paddingLeft: padLeft,
          paddingRight: padRight,
        }}
      >
        {children}
      </View>
    </View>
  ), [audioReactive, children, padLeft, padRight, theme])

  return (
    <>
      <SizeView />
      {isDynamicBg ? fluidComponent : staticThemeComponent}
    </>
  )
}
