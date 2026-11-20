import type { ImageSourcePropType } from 'react-native'
import type { M3SemanticColors } from '../theme/m3'

declare global {
  namespace LX {
    type ThemeMode = 'system' | 'light' | 'dark'
    type ThemeSeedId = 'xmusic' | 'ocean' | 'iris' | 'coral' | 'amber' | 'slate'

    /**
     * Compatibility aliases for components that have not been migrated to the
     * M3 tokens yet. Every value is derived from the single Xmusic theme seed.
     */
    interface LegacyThemeColors {
      'c-theme': string
      'c-app-background': string
      'c-main-background': string
      'c-content-background': string
      'c-border-background': string

      'c-font': string
      'c-font-label': string

      'c-primary': string
      'c-primary-alpha-100': string
      'c-primary-alpha-200': string
      'c-primary-alpha-300': string
      'c-primary-alpha-400': string
      'c-primary-alpha-500': string
      'c-primary-alpha-600': string
      'c-primary-alpha-700': string
      'c-primary-alpha-800': string
      'c-primary-alpha-900': string

      'c-primary-dark-100': string
      'c-primary-dark-100-alpha-100': string
      'c-primary-dark-100-alpha-200': string
      'c-primary-dark-300': string
      'c-primary-dark-300-alpha-800': string

      'c-primary-light-100': string
      'c-primary-light-100-alpha-600': string
      'c-primary-light-100-alpha-700': string
      'c-primary-light-100-alpha-800': string
      'c-primary-light-200-alpha-700': string
      'c-primary-light-200-alpha-900': string
      'c-primary-light-300-alpha-600': string
      'c-primary-light-300-alpha-800': string
      'c-primary-light-400-alpha-300': string
      'c-primary-light-400-alpha-700': string
      'c-primary-light-600-alpha-600': string
      'c-primary-light-600-alpha-900': string
      'c-primary-light-700-alpha-900': string
      'c-primary-light-1000': string
      'c-primary-light-1000-alpha-100': string
      'c-primary-light-1000-alpha-200': string
      'c-primary-light-1000-alpha-300': string
      'c-primary-light-1000-alpha-400': string
      'c-primary-light-1000-alpha-500': string
      'c-primary-light-1000-alpha-600': string
      'c-primary-light-1000-alpha-700': string
      'c-primary-light-1000-alpha-800': string
      'c-primary-light-1000-alpha-900': string

      'c-primary-font': string
      'c-primary-font-hover': string
      'c-primary-font-active': string
      'c-primary-background': string
      'c-primary-background-hover': string
      'c-primary-background-active': string
      'c-primary-input-background': string

      'c-button-font': string
      'c-button-font-selected': string
      'c-button-background': string
      'c-button-background-selected': string
      'c-button-background-hover': string
      'c-button-background-active': string

      'c-list-header-border-bottom': string

      'c-000': string
      'c-050': string
      'c-100': string
      'c-150': string
      'c-200': string
      'c-250': string
      'c-300': string
      'c-350': string
      'c-400': string
      'c-450': string
      'c-500': string
      'c-550': string
      'c-600': string
      'c-650': string
      'c-700': string
      'c-750': string
      'c-800': string
      'c-850': string
      'c-900': string
      'c-950': string
      'c-1000': string

      'c-badge-primary': string
      'c-badge-secondary': string
      'c-badge-tertiary': string
    }

    type ActiveTheme = LegacyThemeColors & M3SemanticColors & {
      id: string
      name: string
      isDark: boolean
      'bg-image-position': string
      'bg-image-size': string
      'bg-image'?: ImageSourcePropType
    }
  }
}
