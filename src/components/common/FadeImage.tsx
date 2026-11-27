import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Image as RNImage, Platform, StyleSheet, UIManager, View, type ViewProps, requireNativeComponent } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useLayout } from '@/utils/hooks'
import AlphaFadeView from './AlphaFadeView'
import { defaultHeaders, isFailedImageUrl, markFailedImageUrl, normalizeImageUri } from './Image'
import { XmusicMark } from './XmusicMark'

interface NativeFadeImageProps extends ViewProps {
  src?: Array<{ uri: string, headers?: Record<string, string> }>
  headers?: Record<string, string>
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
  fadeDuration?: number
  shouldNotifyLoadEvents?: boolean
  onError?: () => void
  topFadeStart?: number
  topFadeEnd?: number
  fadeStart?: number
  fadeEnd?: number
  startCornerRadius?: number
}

export interface FadeImageProps extends ViewProps {
  style?: ViewProps['style']
  url?: string | number | null
  topFadeStart?: number
  topFadeEnd?: number
  fadeStart?: number
  fadeEnd?: number
  startCornerRadius?: number
  onError?: (url: string | number) => void
}

const COMPONENT_NAME = 'XmusicFadeImageView'

const NativeFadeImageView = Platform.OS === 'android' && UIManager.getViewManagerConfig(COMPONENT_NAME) != null
  ? requireNativeComponent<NativeFadeImageProps>(COMPONENT_NAME)
  : null

const EmptyFadePic = memo(({
  style,
  topFadeStart,
  topFadeEnd,
  fadeStart,
  fadeEnd,
}: {
  style?: ViewProps['style']
  topFadeStart: number
  topFadeEnd: number
  fadeStart: number
  fadeEnd: number
}) => {
  const theme = useTheme()
  const { onLayout, width } = useLayout()

  return (
    <AlphaFadeView
      topFadeStart={topFadeStart}
      topFadeEnd={topFadeEnd}
      fadeStart={fadeStart}
      fadeEnd={fadeEnd}
      style={style}
    >
      <View
        style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: theme['m3-primary-container'] }}
        onLayout={onLayout}
      >
        {width > 0 ? <XmusicMark size={Math.min(width * 0.36, 136)} /> : null}
      </View>
    </AlphaFadeView>
  )
})

/**
 * Full-bleed artwork image whose top/bottom alpha edge fades and initial corner
 * radius animate synchronously with shared-element push transitions.
 */
export default memo(({
  url,
  style,
  nativeID,
  topFadeStart = 0.04,
  topFadeEnd = 0.22,
  fadeStart = 0.54,
  fadeEnd = 0.98,
  startCornerRadius = 12,
  onError,
}: FadeImageProps) => {
  const uri = normalizeImageUri(url)
  const [isError, setError] = useState(() => Boolean(uri && isFailedImageUrl(uri)))
  const lastValidUriRef = useRef<string | null>(uri && !isFailedImageUrl(uri) ? uri : null)
  if (uri && !isFailedImageUrl(uri)) {
    lastValidUriRef.current = uri
  }

  useEffect(() => {
    setError(Boolean(uri && isFailedImageUrl(uri)))
  }, [uri])

  const handleError = useCallback(() => {
    markFailedImageUrl(url)
    setError(true)
    if (url != null) onError?.(url)
  }, [onError, url])

  const showDefault = !uri || isError

  const renderImageNode = (targetUri: string, hidden: boolean) => {
    const imgOpacityStyle = hidden ? styles.hiddenFill : styles.fullFill
    if (!NativeFadeImageView) {
      return (
        <AlphaFadeView
          topFadeStart={topFadeStart}
          topFadeEnd={topFadeEnd}
          fadeStart={fadeStart}
          fadeEnd={fadeEnd}
          style={styles.fullFill}
        >
          <RNImage
            style={imgOpacityStyle}
            source={{ uri: targetUri, headers: defaultHeaders, cache: 'force-cache' }}
            resizeMode="cover"
            fadeDuration={0}
            onError={handleError}
            nativeID={nativeID}
          />
        </AlphaFadeView>
      )
    }

    return (
      <NativeFadeImageView
        style={imgOpacityStyle}
        src={[{ uri: targetUri, headers: defaultHeaders }]}
        headers={defaultHeaders}
        resizeMode="cover"
        fadeDuration={0}
        shouldNotifyLoadEvents={true}
        onError={handleError}
        topFadeStart={topFadeStart}
        topFadeEnd={topFadeEnd}
        fadeStart={fadeStart}
        fadeEnd={fadeEnd}
        startCornerRadius={startCornerRadius}
        nativeID={nativeID}
      />
    )
  }

  if (nativeID) {
    const liveUri = lastValidUriRef.current
    if (!liveUri) {
      return (
        <EmptyFadePic
          style={style}
          topFadeStart={topFadeStart}
          topFadeEnd={topFadeEnd}
          fadeStart={fadeStart}
          fadeEnd={fadeEnd}
        />
      )
    }

    return (
      <View style={style} collapsable={false}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {showDefault
            ? (
                <EmptyFadePic
                  style={styles.fullFill}
                  topFadeStart={topFadeStart}
                  topFadeEnd={topFadeEnd}
                  fadeStart={fadeStart}
                  fadeEnd={fadeEnd}
                />
              )
            : null}
        </View>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {renderImageNode(liveUri, showDefault)}
        </View>
      </View>
    )
  }

  if (showDefault) {
    return (
      <EmptyFadePic
        style={style}
        topFadeStart={topFadeStart}
        topFadeEnd={topFadeEnd}
        fadeStart={fadeStart}
        fadeEnd={fadeEnd}
      />
    )
  }

  if (!NativeFadeImageView) {
    return (
      <AlphaFadeView
        topFadeStart={topFadeStart}
        topFadeEnd={topFadeEnd}
        fadeStart={fadeStart}
        fadeEnd={fadeEnd}
        style={style}
      >
        <RNImage
          style={styles.fullFill}
          source={{ uri, headers: defaultHeaders, cache: 'force-cache' }}
          resizeMode="cover"
          fadeDuration={0}
          onError={handleError}
        />
      </AlphaFadeView>
    )
  }

  return (
    <NativeFadeImageView
      style={style}
      src={[{ uri, headers: defaultHeaders }]}
      headers={defaultHeaders}
      resizeMode="cover"
      fadeDuration={0}
      shouldNotifyLoadEvents={true}
      onError={handleError}
      topFadeStart={topFadeStart}
      topFadeEnd={topFadeEnd}
      fadeStart={fadeStart}
      fadeEnd={fadeEnd}
      startCornerRadius={startCornerRadius}
    />
  )
})

const styles = StyleSheet.create({
  fullFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  hiddenFill: {
    flex: 1,
    width: '100%',
    height: '100%',
    opacity: 0,
  },
})
