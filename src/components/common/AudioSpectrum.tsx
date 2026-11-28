import { memo, useMemo } from 'react'
import { processColor, requireNativeComponent, type ViewProps } from 'react-native'

import { useIsPlay } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useCoverPalette, useTheme } from '@/store/theme/hook'
import { blendRgb, parseColorToRgb } from '@/theme/m3'

interface NativeSpectrumProps extends ViewProps {
  mode?: 'ambient' | 'bars' | 'ribbon'
  playing?: boolean
  primaryColor?: number
  secondaryColor?: number
  tertiaryColor?: number
  intensity?: number
}

const NativeSpectrumView = requireNativeComponent<NativeSpectrumProps>('XmusicSpectrumView')

const toNativeArgb = (r: number, g: number, b: number, alpha = 1): number => {
  const rgba = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
  return (processColor(rgba) as number) ?? 0
}

export interface AudioSpectrumProps {
  mode: 'ambient' | 'bars' | 'ribbon'
  intensity?: number
  style?: ViewProps['style']
}

export default memo(({ mode, intensity = 1, style }: AudioSpectrumProps) => {
  const isPlay = useIsPlay()
  const theme = useTheme()
  const coverPalette = useCoverPalette()
  const isDynamicCoverColor = useSettingValue('theme.dynamicCoverColor')

  const colors = useMemo(() => {
    const useCover = isDynamicCoverColor && coverPalette != null && coverPalette.length >= 3
    const base = parseColorToRgb(theme['m3-primary'])
    const c1 = useCover ? parseColorToRgb(coverPalette[0]) : base
    const c2 = useCover ? parseColorToRgb(coverPalette[1]) : parseColorToRgb(theme['m3-secondary'])
    const c3 = useCover ? parseColorToRgb(coverPalette[2]) : parseColorToRgb(theme['m3-tertiary'])
    const accentTarget = parseColorToRgb(theme['m3-primary'])
    const mix = theme.isDark ? 0.85 : 0.72
    const h1 = blendRgb(accentTarget, c1, mix)
    const h2 = blendRgb(accentTarget, c2, mix)
    const h3 = blendRgb(accentTarget, c3, mix)
    return {
      primary: toNativeArgb(h1.r, h1.g, h1.b, 1),
      secondary: toNativeArgb(h2.r, h2.g, h2.b, 1),
      tertiary: toNativeArgb(h3.r, h3.g, h3.b, 1),
    }
  }, [coverPalette, isDynamicCoverColor, theme])

  return (
    <NativeSpectrumView
      pointerEvents="none"
      mode={mode}
      playing={isPlay}
      primaryColor={colors.primary}
      secondaryColor={colors.secondary}
      tertiaryColor={colors.tertiary}
      intensity={intensity}
      style={style}
    />
  )
})
