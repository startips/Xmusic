import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { processColor, requireNativeComponent, StyleSheet, type ViewProps } from 'react-native'

import { useIsPlay } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useCoverPalette, useTheme } from '@/store/theme/hook'
import { blendRgb, parseColorToRgb, shiftColor } from '@/theme/m3'

interface NativeFluidBgProps extends ViewProps {
  baseColor?: number
  colors: number[]
  playing?: boolean
}

const NativeFluidBgView = requireNativeComponent<NativeFluidBgProps>('XmusicFluidBgView')

const DARK_ALPHAS = [0.38, 0.31, 0.26, 0.22] as const
const LIGHT_ALPHAS = [0.24, 0.19, 0.16, 0.13] as const

const mountedFluidStack: symbol[] = []
const stackListeners = new Set<() => void>()
let externalPauseCount = 0
const notifyStackListeners = () => {
  for (const listener of [...stackListeners]) listener()
}

export const acquireFluidPause = (): (() => void) => {
  let released = false
  externalPauseCount++
  if (externalPauseCount === 1) notifyStackListeners()
  return () => {
    if (released) return
    released = true
    externalPauseCount = Math.max(0, externalPauseCount - 1)
    if (externalPauseCount === 0) notifyStackListeners()
  }
}

const toNativeArgb = (r: number, g: number, b: number, alpha: number): number => {
  const rgba = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
  return (processColor(rgba) as number) ?? 0
}

export default memo(({ style }: { style?: ViewProps['style'] }) => {
  const theme = useTheme()
  const coverPalette = useCoverPalette()
  const isDynamicCoverColor = useSettingValue('theme.dynamicCoverColor')
  const isPlay = useIsPlay()
  const instanceId = useRef(Symbol('FluidBackground')).current
  const [isTopmost, setIsTopmost] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [isExternallyPaused, setIsExternallyPaused] = useState(() => externalPauseCount > 0)

  useEffect(() => {
    mountedFluidStack.push(instanceId)
    const syncTop = () => {
      setIsTopmost(mountedFluidStack[mountedFluidStack.length - 1] === instanceId)
      setIsExternallyPaused(externalPauseCount > 0)
    }
    stackListeners.add(syncTop)
    notifyStackListeners()

    return () => {
      stackListeners.delete(syncTop)
      const idx = mountedFluidStack.indexOf(instanceId)
      if (idx >= 0) mountedFluidStack.splice(idx, 1)
      notifyStackListeners()
    }
  }, [instanceId])

  useEffect(() => {
    if (isTopmost) {
      setIsActive(true)
      return
    }
    const timer = setTimeout(() => {
      setIsActive(false)
    }, 340)
    return () => {
      clearTimeout(timer)
    }
  }, [isTopmost])

  const baseColor = useMemo(() => {
    return (processColor(theme['m3-background']) as number) ?? 0
  }, [theme])

  const orbColors = useMemo(() => {
    const surfaceRgb = parseColorToRgb(theme['m3-background'])
    const useCoverOrbs = isDynamicCoverColor && coverPalette != null && coverPalette.length >= 4
    const rawPalette = useCoverOrbs
      ? coverPalette.slice(0, 4)
      : [
          theme['m3-primary'],
          theme['m3-tertiary'],
          theme['m3-secondary'],
          (() => {
            const shifted = shiftColor(theme['m3-primary'], { hue: 38, saturation: 0.92 })
            return `rgb(${Math.round(shifted.r)}, ${Math.round(shifted.g)}, ${Math.round(shifted.b)})`
          })(),
        ]

    const alphas = theme.isDark ? DARK_ALPHAS : LIGHT_ALPHAS
    const tintRatio = theme.isDark ? 0.78 : 0.50

    return rawPalette.map((colorStr, idx) => {
      const rgb = parseColorToRgb(colorStr)
      const harmonized = blendRgb(surfaceRgb, rgb, tintRatio)
      return toNativeArgb(harmonized.r, harmonized.g, harmonized.b, alphas[idx] ?? 0.25)
    })
  }, [coverPalette, isDynamicCoverColor, theme])

  return (
    <NativeFluidBgView
      pointerEvents="none"
      baseColor={baseColor}
      colors={orbColors}
      playing={isPlay && isActive && !isExternallyPaused}
      style={[StyleSheet.absoluteFill, style]}
    />
  )
})
