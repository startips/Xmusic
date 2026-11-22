import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import Image, { getSize, type ImageProps } from '@/components/common/Image'

export interface ScaledImageProps extends Pick<ImageProps, 'style'> {
  url: string
  width?: number
  height?: number
  maxWidth?: number
  maxHeight?: number
}

export default ({ url, width, height, maxWidth, maxHeight, style }: ScaledImageProps) => {
  const [wh, setWH] = useState({ width: 0, height: 0 })

  useEffect(() => {
    let cancelled = false
    getSize(url, (realWidth, realHeight) => {
      if (cancelled || realWidth <= 0 || realHeight <= 0) return
      let w = width ?? 0
      let h = height ?? 0

      if (w && !h) {
        h = realHeight * (w / realWidth)
      } else if (!w && h) {
        w = realWidth * (h / realHeight)
      } else {
        if (maxWidth && realWidth > maxWidth) {
          w = maxWidth
          h = realHeight * (w / realWidth)

          if (maxHeight && h > maxHeight) {
            h = maxHeight
            w = realWidth * (maxHeight / realHeight)
          }
        } else if (maxHeight && realHeight > maxHeight) {
          h = maxHeight
          w = realWidth * (maxHeight / realHeight)
        }
      }
      setWH({ width: w || realWidth, height: h || realHeight })
    })
    return () => {
      cancelled = true
    }
  }, [height, maxHeight, maxWidth, url, width])

  return (
    wh.width ? (<Image
      url={url}
      style={StyleSheet.compose({ height: wh.height, width: wh.width }, style)}
    />) : null
  )
}
