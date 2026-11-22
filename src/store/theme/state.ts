import { createContext } from 'react'
import { createActiveTheme } from '@/theme/palette'

export interface InitState {
  /**
   * System dark mode state, independent from the manually selected theme mode.
   */
  shouldUseDarkColors: boolean
  theme: LX.ActiveTheme
  coverSeedColor: string | null
  coverPalette: string[] | null
}

const state: InitState = {
  shouldUseDarkColors: false,
  theme: createActiveTheme(false),
  coverSeedColor: null,
  coverPalette: null,
}

export const ThemeContext = createContext(state.theme)

export default state
