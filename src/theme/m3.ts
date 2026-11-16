import { Animated } from 'react-native'

interface RGB {
  r: number
  g: number
  b: number
}

const clampChannel = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

/**
 * Parse rgb()/rgba()/#hex color strings into numeric RGB channels.
 * Falls back to neutral slate if a custom theme uses an unrecognized format.
 */
export const parseColorToRgb = (color: string): RGB => {
  const trimmed = color.trim()
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16) || 0,
        g: parseInt(hex[1] + hex[1], 16) || 0,
        b: parseInt(hex[2] + hex[2], 16) || 0,
      }
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16) || 0,
        g: parseInt(hex.slice(2, 4), 16) || 0,
        b: parseInt(hex.slice(4, 6), 16) || 0,
      }
    }
  }
  const match = trimmed.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  if (match) {
    return {
      r: clampChannel(Number(match[1])),
      g: clampChannel(Number(match[2])),
      b: clampChannel(Number(match[3])),
    }
  }
  return { r: 77, g: 175, b: 124 }
}

const toRgbString = ({ r, g, b }: RGB, alpha?: number): string => {
  const rr = clampChannel(r)
  const gg = clampChannel(g)
  const bb = clampChannel(b)
  return alpha == null ? `rgb(${rr}, ${gg}, ${bb})` : `rgba(${rr}, ${gg}, ${bb}, ${alpha})`
}

export const blendRgb = (base: RGB, tint: RGB, ratio: number): RGB => {
  const p = Math.max(0, Math.min(1, ratio))
  return {
    r: base.r * (1 - p) + tint.r * p,
    g: base.g * (1 - p) + tint.g * p,
    b: base.b * (1 - p) + tint.b * p,
  }
}

const relativeLuminance = ({ r, g, b }: RGB): number => {
  const linearize = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

export const withAlpha = (color: string, alpha: number): string => {
  return toRgbString(parseColorToRgb(color), Math.max(0, Math.min(1, alpha)))
}

/**
 * Strip alpha and normalize a color token to opaque rgb() for Android system bars.
 */
export const toOpaqueColor = (color: string): string => {
  return toRgbString(parseColorToRgb(color))
}

export interface M3SemanticColors {
  'm3-primary': string
  'm3-on-primary': string
  'm3-primary-container': string
  'm3-on-primary-container': string
  'm3-secondary-container': string
  'm3-on-secondary-container': string
  'm3-surface': string
  'm3-surface-container-lowest': string
  'm3-surface-container-low': string
  'm3-surface-container': string
  'm3-surface-container-high': string
  'm3-surface-container-highest': string
  'm3-on-surface': string
  'm3-on-surface-variant': string
  'm3-outline': string
  'm3-outline-variant': string
  'm3-scrim': string
}

/**
 * Derive Material 3 Expressive tonal color roles from any active LX theme's
 * primary seed color while preserving contrast on both light and dark themes.
 */
export const buildM3ThemeColors = (
  primaryColor: string,
  isDark: boolean,
  onSurfaceFallback: string,
  onSurfaceVariantFallback: string,
): M3SemanticColors => {
  const seed = parseColorToRgb(primaryColor)
  const white: RGB = { r: 255, g: 255, b: 255 }
  const black: RGB = { r: 16, g: 18, b: 17 }

  if (isDark) {
    const seedLum = relativeLuminance(seed)
    const primaryRgb = seedLum < 0.25 ? blendRgb(seed, white, 0.35) : blendRgb(seed, white, 0.12)
    const onPrimary = relativeLuminance(primaryRgb) > 0.38 ? '#181C19' : '#FFFFFF'

    return {
      'm3-primary': toRgbString(primaryRgb),
      'm3-on-primary': onPrimary,
      'm3-primary-container': toRgbString(blendRgb(black, seed, 0.28)),
      'm3-on-primary-container': toRgbString(blendRgb(white, seed, 0.22)),
      'm3-secondary-container': toRgbString(blendRgb(black, seed, 0.20)),
      'm3-on-secondary-container': toRgbString(blendRgb(white, seed, 0.14)),
      'm3-surface': toRgbString(blendRgb({ r: 16, g: 18, b: 17 }, seed, 0.03)),
      'm3-surface-container-lowest': '#0B0D0C',
      'm3-surface-container-low': toRgbString(blendRgb({ r: 24, g: 26, b: 25 }, seed, 0.05)),
      'm3-surface-container': toRgbString(blendRgb({ r: 30, g: 33, b: 31 }, seed, 0.07)),
      'm3-surface-container-high': toRgbString(blendRgb({ r: 38, g: 42, b: 40 }, seed, 0.09)),
      'm3-surface-container-highest': toRgbString(blendRgb({ r: 47, g: 52, b: 49 }, seed, 0.11)),
      'm3-on-surface': onSurfaceFallback || '#ECEEED',
      'm3-on-surface-variant': onSurfaceVariantFallback || '#B3BCB7',
      'm3-outline': 'rgba(255, 255, 255, 0.22)',
      'm3-outline-variant': 'rgba(255, 255, 255, 0.10)',
      'm3-scrim': 'rgba(0, 0, 0, 0.52)',
    }
  }

  const seedLum = relativeLuminance(seed)
  // Keep primary vibrant while ensuring text/button legibility on light canvas
  const primaryRgb = seedLum > 0.65 ? blendRgb(seed, black, 0.12) : seed
  const onPrimary = relativeLuminance(primaryRgb) > 0.44 ? '#1E1B16' : '#FFFFFF'

  return {
    'm3-primary': toRgbString(primaryRgb),
    'm3-on-primary': onPrimary,
    'm3-primary-container': toRgbString(blendRgb(white, seed, 0.18)),
    'm3-on-primary-container': toRgbString(blendRgb(black, seed, 0.42)),
    'm3-secondary-container': toRgbString(blendRgb(white, seed, 0.14)),
    'm3-on-secondary-container': toRgbString(blendRgb(black, seed, 0.35)),
    'm3-surface': toRgbString(blendRgb(white, seed, 0.02)),
    'm3-surface-container-lowest': '#FFFFFF',
    'm3-surface-container-low': toRgbString(blendRgb(white, seed, 0.045)),
    'm3-surface-container': toRgbString(blendRgb(white, seed, 0.075)),
    'm3-surface-container-high': toRgbString(blendRgb(white, seed, 0.115)),
    'm3-surface-container-highest': toRgbString(blendRgb(white, seed, 0.155)),
    'm3-on-surface': onSurfaceFallback || '#191C1A',
    'm3-on-surface-variant': onSurfaceVariantFallback || '#5C6460',
    'm3-outline': toRgbString(blendRgb({ r: 120, g: 125, b: 122 }, seed, 0.25), 0.55),
    'm3-outline-variant': toRgbString(blendRgb({ r: 140, g: 145, b: 142 }, seed, 0.22), 0.16),
    'm3-scrim': 'rgba(0, 0, 0, 0.36)',
  }
}

/**
 * Material 3 Expressive Shape Scale
 */
export const M3Radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 9999,
} as const

/**
 * Material 3 Spacing Scale (4dp grid)
 */
export const M3Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const

/**
 * Material 3 Expressive Spring Motion Helpers
 * Tuned for zero-native-dependency Animated API (useNativeDriver compatible).
 */
export const M3Motion = {
  spatialFast: {
    damping: 18,
    stiffness: 280,
    mass: 0.85,
    useNativeDriver: true,
  },
  spatialDefault: {
    damping: 20,
    stiffness: 210,
    mass: 1,
    useNativeDriver: true,
  },
  effectsFast: {
    duration: 180,
    useNativeDriver: true,
  },
  pressSpring(anim: Animated.Value, toValue: number) {
    return Animated.spring(anim, {
      toValue,
      damping: 16,
      stiffness: 320,
      mass: 0.75,
      useNativeDriver: true,
    })
  },
} as const
