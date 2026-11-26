import { useContext, useEffect, useState } from 'react'
import { useSettingValue } from '@/store/setting/hook'
import themeState, { ThemeContext } from './state'

export const useTheme = () => useContext(ThemeContext)

/**
 * Tonal surface color for slide-out drawers and floating lists so light mode
 * with dynamic fluid background blends naturally instead of appearing stark white.
 */
export const useDrawerSurfaceColor = () => {
  const theme = useTheme()
  const isDynamicBg = useSettingValue('theme.dynamicBg')
  if (theme.isDark) return theme['m3-surface-container-low']
  return isDynamicBg ? theme['m3-surface-container'] : theme['m3-surface-container-low']
}

export const useCoverPalette = () => {
  const [palette, setPalette] = useState<string[] | null>(themeState.coverPalette)

  useEffect(() => {
    setPalette(themeState.coverPalette)
    const handleUpdate = (next: string[] | null) => {
      setPalette(next)
    }
    global.state_event.on('coverPaletteUpdated', handleUpdate)
    return () => {
      global.state_event.off('coverPaletteUpdated', handleUpdate)
    }
  }, [])

  return palette
}
