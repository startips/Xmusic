import { useTheme } from '@/store/theme/hook'
import { BorderRadius } from '@/theme'
import { createStyle } from '@/utils/tools'
import { type ComponentProps, memo, useCallback, useEffect, useRef, useState } from 'react'
import { View, type ViewProps, StyleSheet, Image as FastImage } from 'react-native'
import { XmusicMark } from './XmusicMark'
import { useLayout } from '@/utils/hooks'

export interface ImageProps extends ViewProps {
  style: ComponentProps<typeof FastImage>['style']
  url?: string | number | null
  cache?: boolean
  resizeMode?: ComponentProps<typeof FastImage>['resizeMode']
  onError?: (url: string | number) => void
}


export const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
}

const MAX_FAILED_URL_CACHE = 500
const failedImageUrls = new Set<string>()

export const normalizeImageUri = (url?: string | number | null): string | null => {
  if (url == null || url === '') return null
  if (typeof url === 'number') return FastImage.resolveAssetSource(url).uri
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.startsWith('/') ? `file://${trimmed}` : trimmed
}

export const isFailedImageUrl = (url?: string | number | null): boolean => {
  const uri = normalizeImageUri(url)
  return uri ? failedImageUrls.has(uri) : false
}

export const markFailedImageUrl = (url?: string | number | null) => {
  const uri = normalizeImageUri(url)
  if (!uri) return
  if (failedImageUrls.size >= MAX_FAILED_URL_CACHE) {
    const first = failedImageUrls.values().next().value
    if (first) failedImageUrls.delete(first)
  }
  failedImageUrls.add(uri)
}

const EmptyPic = memo(({ style, nativeID }: { style: ImageProps['style'], nativeID?: ImageProps['nativeID'] }) => {
  const theme = useTheme()
  const { onLayout, width } = useLayout()

  return (
    <View
      style={StyleSheet.compose({ ...styles.emptyPic, backgroundColor: theme['m3-primary-container'] }, style)}
      onLayout={onLayout}
      nativeID={nativeID}
    >
      <XmusicMark size={width} />
    </View>
  )
})

const Image = memo(({ url, cache, resizeMode = 'cover', style, onError, nativeID }: ImageProps) => {
  const uri = normalizeImageUri(url)
  const [isError, setError] = useState(() => Boolean(uri && failedImageUrls.has(uri)))
  const lastValidUriRef = useRef<string | null>(uri && !failedImageUrls.has(uri) ? uri : null)
  if (uri && !failedImageUrls.has(uri)) {
    lastValidUriRef.current = uri
  }

  const handleError = useCallback(() => {
    markFailedImageUrl(url)
    setError(true)
    onError?.(url!)
  }, [onError, url])

  useEffect(() => {
    setError(Boolean(uri && failedImageUrls.has(uri)))
  }, [uri])

  const showDefault = !uri || isError

  if (nativeID) {
    const liveUri = lastValidUriRef.current
    if (!liveUri) {
      return <EmptyPic style={style} />
    }
    return (
      <View style={StyleSheet.compose(styles.nativeWrap, style)} collapsable={false}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {showDefault ? <EmptyPic style={styles.fillPic} /> : null}
        </View>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <FastImage
            style={showDefault ? styles.hiddenFillImage : styles.fillImage}
            source={{
              uri: liveUri,
              headers: defaultHeaders,
              cache: cache === false ? 'reload' : 'force-cache',
            }}
            onError={handleError}
            resizeMode={resizeMode}
            nativeID={nativeID}
          />
        </View>
      </View>
    )
  }

  return (
    showDefault
      ? <EmptyPic style={style} />
      : (
          <FastImage
            style={style}
            source={{
              uri,
              headers: defaultHeaders,
              cache: cache === false ? 'reload' : 'force-cache',
            }}
            onError={handleError}
            resizeMode={resizeMode}
          />
        )
  )
}, (prevProps, nextProps) => {
  return prevProps.url == nextProps.url &&
    prevProps.style == nextProps.style &&
    prevProps.nativeID == nextProps.nativeID
})

export const getSize = (uri: string, success: (width: number, height: number) => void, failure?: (error: any) => void) => {
  FastImage.getSize(uri, success, failure)
}
export const clearMemoryCache = async() => {
  // return Promise.all([FastImage.clearMemoryCache(), FastImage.clearDiskCache()])
}
export default Image

const styles = createStyle({
  emptyPic: {
    borderRadius: BorderRadius.normal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeWrap: {
    overflow: 'hidden',
  },
  fillPic: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  fillImage: {
    ...StyleSheet.absoluteFillObject,
  },
  hiddenFillImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
})
