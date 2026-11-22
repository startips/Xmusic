import { memo } from 'react'
import { Image, type ImageSourcePropType } from 'react-native'
import { useTheme } from '@/store/theme/hook'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xmusicMarkSource: ImageSourcePropType = require('@/resources/images/xmusic_mark.png')

export interface XmusicMarkProps {
  /** Container width in density-independent pixels used to size the emblem proportionally. */
  size: number
}

/**
 * Xmusic geometric X-note emblem sourced from generated multi-density monochrome assets and tinted with the active theme.
 */
export const XmusicMark = memo(({ size }: XmusicMarkProps) => {
  const theme = useTheme()
  if (size <= 0) return null

  const markSize = Math.round(size * 0.62)

  return (
    <Image
      source={xmusicMarkSource}
      resizeMode="contain"
      style={{
        width: markSize,
        height: markSize,
        tintColor: theme['m3-on-primary-container'],
      }}
    />
  )
})
