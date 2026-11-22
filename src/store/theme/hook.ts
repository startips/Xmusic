import { useContext, useEffect, useState } from 'react'
import themeState, { ThemeContext } from './state'

export const useTheme = () => useContext(ThemeContext)

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
