import { buildM3ThemeColors, withAlpha } from './m3'

export interface ThemeSeedOption {
  id: LX.ThemeSeedId
  seed: string
  nameKey:
  | 'setting_basic_theme_seed_xmusic'
  | 'setting_basic_theme_seed_ocean'
  | 'setting_basic_theme_seed_iris'
  | 'setting_basic_theme_seed_coral'
  | 'setting_basic_theme_seed_amber'
  | 'setting_basic_theme_seed_slate'
}

/**
 * Xmusic Material 3 Expressive theme.
 *
 * The whole app derives its full tonal color system from a single selected
 * seed color. Legacy `c-*` tokens below are thin aliases over M3 roles so
 * unmigrated components automatically follow the active seed and dark mode.
 */
export const XMUSIC_THEME_ID: LX.ThemeSeedId = 'xmusic'
export const XMUSIC_THEME_NAME = 'Xmusic'
export const XMUSIC_THEME_SEED = 'rgb(77, 175, 124)'

export const XMUSIC_THEME_SEEDS: readonly ThemeSeedOption[] = [
  { id: 'xmusic', seed: XMUSIC_THEME_SEED, nameKey: 'setting_basic_theme_seed_xmusic' },
  { id: 'ocean', seed: 'rgb(59, 130, 206)', nameKey: 'setting_basic_theme_seed_ocean' },
  { id: 'iris', seed: 'rgb(124, 92, 204)', nameKey: 'setting_basic_theme_seed_iris' },
  { id: 'coral', seed: 'rgb(218, 92, 114)', nameKey: 'setting_basic_theme_seed_coral' },
  { id: 'amber', seed: 'rgb(212, 132, 42)', nameKey: 'setting_basic_theme_seed_amber' },
  { id: 'slate', seed: 'rgb(92, 118, 130)', nameKey: 'setting_basic_theme_seed_slate' },
]

export const getThemeSeedOption = (seedId?: string): ThemeSeedOption => {
  return XMUSIC_THEME_SEEDS.find(item => item.id === seedId) ?? XMUSIC_THEME_SEEDS[0]
}

const buildLegacyAliases = (isDark: boolean, seed: string): LX.LegacyThemeColors => {
  const m3 = buildM3ThemeColors(seed, isDark)
  const primary = m3['m3-primary']

  const surface = m3['m3-surface']
  const onSurface = m3['m3-on-surface']
  const onSurfaceVariant = m3['m3-on-surface-variant']
  const outline = m3['m3-outline']
  const primaryContainer = m3['m3-primary-container']
  const secondaryContainer = m3['m3-secondary-container']

  return {
    'c-theme': primary,
    'c-app-background': m3['m3-background'],
    'c-main-background': withAlpha(surface, isDark ? 0.94 : 0.92),
    'c-content-background': surface,
    'c-border-background': m3['m3-outline-variant'],

    'c-font': onSurface,
    'c-font-label': onSurfaceVariant,

    'c-primary': primary,
    'c-primary-alpha-100': withAlpha(primary, 0.90),
    'c-primary-alpha-200': withAlpha(primary, 0.80),
    'c-primary-alpha-300': withAlpha(primary, 0.70),
    'c-primary-alpha-400': withAlpha(primary, 0.60),
    'c-primary-alpha-500': withAlpha(primary, 0.50),
    'c-primary-alpha-600': withAlpha(primary, 0.40),
    'c-primary-alpha-700': withAlpha(primary, 0.30),
    'c-primary-alpha-800': withAlpha(primary, 0.20),
    'c-primary-alpha-900': withAlpha(primary, 0.10),

    'c-primary-dark-100': withAlpha(primary, 0.95),
    'c-primary-dark-100-alpha-100': withAlpha(primary, 0.90),
    'c-primary-dark-100-alpha-200': withAlpha(primary, 0.80),
    'c-primary-dark-300': withAlpha(primary, 0.80),
    'c-primary-dark-300-alpha-800': withAlpha(primaryContainer, 0.70),

    'c-primary-light-100': primaryContainer,
    'c-primary-light-100-alpha-600': withAlpha(primaryContainer, 0.70),
    'c-primary-light-100-alpha-700': withAlpha(primaryContainer, 0.55),
    'c-primary-light-100-alpha-800': withAlpha(primaryContainer, 0.40),
    'c-primary-light-200-alpha-700': withAlpha(primaryContainer, 0.50),
    'c-primary-light-200-alpha-900': withAlpha(primaryContainer, 0.28),
    'c-primary-light-300-alpha-600': withAlpha(primary, 0.22),
    'c-primary-light-300-alpha-800': withAlpha(primary, 0.14),
    'c-primary-light-400-alpha-300': withAlpha(primary, 0.30),
    'c-primary-light-400-alpha-700': secondaryContainer,
    'c-primary-light-600-alpha-600': withAlpha(secondaryContainer, 0.72),
    'c-primary-light-600-alpha-900': withAlpha(secondaryContainer, 0.40),
    'c-primary-light-700-alpha-900': withAlpha(secondaryContainer, 0.22),
    'c-primary-light-1000': m3['m3-surface-container-lowest'],
    'c-primary-light-1000-alpha-100': withAlpha(m3['m3-surface-container-lowest'], 0.90),
    'c-primary-light-1000-alpha-200': withAlpha(m3['m3-surface-container-lowest'], 0.80),
    'c-primary-light-1000-alpha-300': withAlpha(m3['m3-surface-container-lowest'], 0.70),
    'c-primary-light-1000-alpha-400': withAlpha(m3['m3-surface-container-lowest'], 0.60),
    'c-primary-light-1000-alpha-500': withAlpha(m3['m3-surface-container-lowest'], 0.50),
    'c-primary-light-1000-alpha-600': withAlpha(m3['m3-surface-container-lowest'], 0.40),
    'c-primary-light-1000-alpha-700': withAlpha(m3['m3-surface-container-lowest'], 0.30),
    'c-primary-light-1000-alpha-800': withAlpha(m3['m3-surface-container-lowest'], 0.20),
    'c-primary-light-1000-alpha-900': withAlpha(m3['m3-surface-container-lowest'], 0.10),

    'c-primary-font': primary,
    'c-primary-font-hover': withAlpha(primary, 0.70),
    'c-primary-font-active': withAlpha(primary, 0.85),
    'c-primary-background': secondaryContainer,
    'c-primary-background-hover': withAlpha(primary, 0.14),
    'c-primary-background-active': withAlpha(primary, 0.22),
    'c-primary-input-background': m3['m3-surface-container-high'],

    'c-button-font': m3['m3-on-secondary-container'],
    'c-button-font-selected': m3['m3-on-primary'],
    'c-button-background': secondaryContainer,
    'c-button-background-selected': primary,
    'c-button-background-hover': m3['m3-surface-container-high'],
    'c-button-background-active': m3['m3-surface-container-highest'],

    'c-list-header-border-bottom': m3['m3-outline-variant'],

    // Neutral scale aliases, flipped for dark mode so secondary text
    // automatically keeps sufficient contrast.
    'c-000': m3['m3-inverse-on-surface'],
    'c-050': m3['m3-surface-container-lowest'],
    'c-100': m3['m3-surface-container-low'],
    'c-150': m3['m3-surface-container'],
    'c-200': m3['m3-surface-container-high'],
    'c-250': m3['m3-surface-container-highest'],
    'c-300': outline,
    'c-350': outline,
    'c-400': outline,
    'c-450': outline,
    'c-500': onSurfaceVariant,
    'c-550': onSurfaceVariant,
    'c-600': onSurfaceVariant,
    'c-650': onSurfaceVariant,
    'c-700': onSurfaceVariant,
    'c-750': onSurface,
    'c-800': onSurface,
    'c-850': onSurface,
    'c-900': onSurface,
    'c-950': onSurface,
    'c-1000': m3['m3-inverse-surface'],

    'c-badge-primary': m3['m3-primary'],
    'c-badge-secondary': m3['m3-tertiary'],
    'c-badge-tertiary': m3['m3-secondary'],

  }
}

export const createActiveTheme = (isDark: boolean, seedId: LX.ThemeSeedId = XMUSIC_THEME_ID): LX.ActiveTheme => {
  const seedOption = getThemeSeedOption(seedId)
  return {
    id: seedOption.id,
    name: XMUSIC_THEME_NAME,
    isDark,
    ...buildM3ThemeColors(seedOption.seed, isDark),
    ...buildLegacyAliases(isDark, seedOption.seed),
    'bg-image-position': 'center',
    'bg-image-size': 'cover',
  }
}
