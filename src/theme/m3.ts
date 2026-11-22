import { Animated } from 'react-native'

interface RGB {
  r: number
  g: number
  b: number
}

const clampChannel = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

/**
 * Parse rgb()/rgba()/#hex color strings into numeric RGB channels.
 * Falls back to neutral slate if a custom color uses an unrecognized format.
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

const rgbToHsl = ({ r, g, b }: RGB): { h: number, s: number, l: number } => {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case rr:
      h = (gg - bb) / d + (gg < bb ? 6 : 0)
      break
    case gg:
      h = (bb - rr) / d + 2
      break
    default:
      h = (rr - gg) / d + 4
  }
  return { h: h / 6, s, l }
}

const hslToRgb = ({ h, s, l }: { h: number, s: number, l: number }): RGB => {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) {
    const v = l * 255
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  }
}

/**
 * Rotate the hue of a color and optionally tweak saturation / lightness.
 */
export const shiftColor = (color: string, options: { hue?: number, saturation?: number, lightness?: number }) => {
  const hsl = rgbToHsl(parseColorToRgb(color))
  const h = ((hsl.h + (options.hue ?? 0) / 360) % 1 + 1) % 1
  const s = Math.max(0, Math.min(1, hsl.s * (options.saturation ?? 1)))
  const l = Math.max(0, Math.min(1, hsl.l + (options.lightness ?? 0)))
  return hslToRgb({ h, s, l })
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

/**
 * Full Material 3 color role set used by the Xmusic theme.
 */
export interface M3SemanticColors {
  'm3-primary': string
  'm3-on-primary': string
  'm3-primary-container': string
  'm3-on-primary-container': string

  'm3-secondary': string
  'm3-on-secondary': string
  'm3-secondary-container': string
  'm3-on-secondary-container': string

  'm3-tertiary': string
  'm3-on-tertiary': string
  'm3-tertiary-container': string
  'm3-on-tertiary-container': string

  'm3-error': string
  'm3-on-error': string
  'm3-error-container': string
  'm3-on-error-container': string

  'm3-background': string
  'm3-on-background': string
  'm3-surface': string
  'm3-surface-variant': string
  'm3-surface-tint': string
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

  'm3-inverse-surface': string
  'm3-inverse-on-surface': string
  'm3-inverse-primary': string
}

/**
 * Derive a complete Material 3 Expressive tonal color set from a single
 * primary seed color while preserving contrast on both light and dark themes.
 */
export const buildM3ThemeColors = (
  primaryColor: string,
  isDark: boolean,
  onSurfaceFallback?: string,
  onSurfaceVariantFallback?: string,
): M3SemanticColors => {
  const seed = parseColorToRgb(primaryColor)
  const white: RGB = { r: 255, g: 255, b: 255 }
  const black: RGB = { r: 14, g: 16, b: 15 }

  // Secondary / tertiary tonal families keep the seed's hue while widening
  // the palette enough for badges, highlights and containers.
  const secondarySeed = shiftColor(primaryColor, { saturation: 0.42, lightness: isDark ? 0.16 : -0.04 })
  const tertiarySeed = shiftColor(primaryColor, { hue: 58, saturation: 0.92, lightness: isDark ? 0.14 : 0 })

  if (isDark) {
    const seedLum = relativeLuminance(seed)
    const primaryRgb = seedLum < 0.25 ? blendRgb(seed, white, 0.35) : blendRgb(seed, white, 0.12)
    const onPrimary = relativeLuminance(primaryRgb) > 0.38 ? '#181C19' : '#FFFFFF'
    const secondaryRgb = blendRgb(secondarySeed, white, 0.24)
    const tertiaryRgb = blendRgb(tertiarySeed, white, 0.20)

    return {
      'm3-primary': toRgbString(primaryRgb),
      'm3-on-primary': onPrimary,
      'm3-primary-container': toRgbString(blendRgb(black, seed, 0.28)),
      'm3-on-primary-container': toRgbString(blendRgb(white, seed, 0.22)),

      'm3-secondary': toRgbString(secondaryRgb),
      'm3-on-secondary': relativeLuminance(secondaryRgb) > 0.38 ? '#181C19' : '#FFFFFF',
      'm3-secondary-container': toRgbString(blendRgb(black, secondarySeed, 0.34)),
      'm3-on-secondary-container': toRgbString(blendRgb(white, secondarySeed, 0.18)),

      'm3-tertiary': toRgbString(tertiaryRgb),
      'm3-on-tertiary': relativeLuminance(tertiaryRgb) > 0.38 ? '#181C19' : '#FFFFFF',
      'm3-tertiary-container': toRgbString(blendRgb(black, tertiarySeed, 0.30)),
      'm3-on-tertiary-container': toRgbString(blendRgb(white, tertiarySeed, 0.20)),

      'm3-error': '#F2B8B5',
      'm3-on-error': '#601410',
      'm3-error-container': '#8C1D18',
      'm3-on-error-container': '#F9DEDC',

      'm3-background': toRgbString(blendRgb({ r: 12, g: 15, b: 13 }, seed, 0.03)),
      'm3-on-background': onSurfaceFallback ?? '#E2E3E1',
      'm3-surface': toRgbString(blendRgb({ r: 16, g: 18, b: 17 }, seed, 0.03)),
      'm3-surface-variant': toRgbString(blendRgb({ r: 38, g: 42, b: 40 }, seed, 0.08)),
      'm3-surface-tint': toRgbString(primaryRgb),
      'm3-surface-container-lowest': '#0B0D0C',
      'm3-surface-container-low': toRgbString(blendRgb({ r: 24, g: 26, b: 25 }, seed, 0.05)),
      'm3-surface-container': toRgbString(blendRgb({ r: 30, g: 33, b: 31 }, seed, 0.07)),
      'm3-surface-container-high': toRgbString(blendRgb({ r: 38, g: 42, b: 40 }, seed, 0.09)),
      'm3-surface-container-highest': toRgbString(blendRgb({ r: 47, g: 52, b: 49 }, seed, 0.11)),
      'm3-on-surface': onSurfaceFallback ?? '#E2E3E1',
      'm3-on-surface-variant': onSurfaceVariantFallback ?? '#B3BCB7',

      'm3-outline': 'rgba(255, 255, 255, 0.22)',
      'm3-outline-variant': 'rgba(255, 255, 255, 0.10)',
      'm3-scrim': 'rgba(0, 0, 0, 0.52)',

      'm3-inverse-surface': toRgbString(blendRgb({ r: 226, g: 227, b: 225 }, seed, 0.03)),
      'm3-inverse-on-surface': '#303331',
      'm3-inverse-primary': toRgbString(blendRgb(seed, black, 0.42)),
    }
  }

  const seedLum = relativeLuminance(seed)
  // Keep primary vibrant while ensuring >= 4.5:1 WCAG AA contrast against both #FFFFFF and light surfaces
  let primaryRgb = seed
  if (seedLum > 0.175) {
    const darkenRatio = Math.min(0.52, Math.max(0.18, (seedLum - 0.14) / Math.max(0.22, seedLum)))
    primaryRgb = blendRgb(seed, black, darkenRatio)
  }
  const onPrimary = relativeLuminance(primaryRgb) > 0.36 ? '#1E1B16' : '#FFFFFF'
  const secondaryRgb = shiftColor(toRgbString(primaryRgb), { saturation: 0.58, lightness: -0.06 })
  let tertiaryRgb = shiftColor(toRgbString(seed), { hue: 58, saturation: 0.88, lightness: -0.14 })
  if (relativeLuminance(tertiaryRgb) > 0.19) {
    tertiaryRgb = blendRgb(tertiaryRgb, black, 0.32)
  }

  return {
    'm3-primary': toRgbString(primaryRgb),
    'm3-on-primary': onPrimary,
    'm3-primary-container': toRgbString(blendRgb(white, seed, 0.18)),
    'm3-on-primary-container': toRgbString(blendRgb(black, seed, 0.50)),

    'm3-secondary': toRgbString(secondaryRgb),
    'm3-on-secondary': relativeLuminance(secondaryRgb) > 0.44 ? '#1E1B16' : '#FFFFFF',
    'm3-secondary-container': toRgbString(blendRgb(white, secondaryRgb, 0.18)),
    'm3-on-secondary-container': toRgbString(blendRgb(black, secondaryRgb, 0.52)),

    'm3-tertiary': toRgbString(tertiaryRgb),
    'm3-on-tertiary': relativeLuminance(tertiaryRgb) > 0.44 ? '#1E1B16' : '#FFFFFF',
    'm3-tertiary-container': toRgbString(blendRgb(white, tertiaryRgb, 0.18)),
    'm3-on-tertiary-container': toRgbString(blendRgb(black, tertiaryRgb, 0.52)),

    'm3-error': '#B3261E',
    'm3-on-error': '#FFFFFF',
    'm3-error-container': '#F9DEDC',
    'm3-on-error-container': '#410E0B',

    'm3-background': toRgbString(blendRgb(white, seed, 0.02)),
    'm3-on-background': onSurfaceFallback ?? '#191C1A',
    'm3-surface': toRgbString(blendRgb(white, seed, 0.02)),
    'm3-surface-variant': toRgbString(blendRgb(white, seed, 0.10)),
    'm3-surface-tint': toRgbString(primaryRgb),
    'm3-surface-container-lowest': '#FFFFFF',
    'm3-surface-container-low': toRgbString(blendRgb(white, seed, 0.045)),
    'm3-surface-container': toRgbString(blendRgb(white, seed, 0.075)),
    'm3-surface-container-high': toRgbString(blendRgb(white, seed, 0.115)),
    'm3-surface-container-highest': toRgbString(blendRgb(white, seed, 0.155)),
    'm3-on-surface': onSurfaceFallback ?? '#191C1A',
    'm3-on-surface-variant': onSurfaceVariantFallback ?? '#5C6460',

    'm3-outline': toRgbString(blendRgb({ r: 120, g: 125, b: 122 }, seed, 0.25), 0.55),
    'm3-outline-variant': toRgbString(blendRgb({ r: 140, g: 145, b: 142 }, seed, 0.22), 0.16),
    'm3-scrim': 'rgba(0, 0, 0, 0.36)',

    'm3-inverse-surface': toRgbString(blendRgb({ r: 48, g: 51, b: 49 }, seed, 0.05)),
    'm3-inverse-on-surface': '#F0F1EF',
    'm3-inverse-primary': toRgbString(blendRgb(seed, white, 0.38)),
  }
}

/**
 * Material 3 Expressive Shape Scale
 */
export const M3Radius = {
  normal: 4,
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
 * Material 3 border widths used by legacy list/menu components.
 */
export const M3BorderWidths = {
  normal: 0.4,
  normal1: 0.6,
  normal2: 1,
  normal3: 1.4,
  normal4: 2,
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
