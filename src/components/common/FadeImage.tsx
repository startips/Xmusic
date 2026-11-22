import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Image as RNImage, Platform, UIManager, View, type ViewProps, requireNativeComponent } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useLayout } from '@/utils/hooks'
import AlphaFadeView from './AlphaFadeView'
import { defaultHeaders } from './Image'
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
  nativeID,
  topFadeStart,
  topFadeEnd,
  fadeStart,
  fadeEnd,
}: {
  style?: ViewProps['style']
  nativeID?: string
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
        nativeID={nativeID}
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
  const [isError, setError] = useState(false)

  useEffect(() => {
    setError(false)
  }, [url])

  const handleError = useCallback(() => {
    setError(true)
    if (url != null) onError?.(url)
  }, [onError, url])

  const uri = typeof url === 'number'
    ? RNImage.resolveAssetSource(url).uri
    : url?.startsWith('/')
      ? `file://${url}`
      : url

  const showDefault = useMemo(() => !uri || isError, [isError, uri])

  if (showDefault) {
    return (
      <EmptyFadePic
        style={style}
        nativeID={nativeID}
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
          style={{ flex: 1, width: '100%', height: '100%' }}
          source={{ uri: uri!, headers: defaultHeaders, cache: 'force-cache' }}
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
      style={style}
      src={[{ uri: uri!, headers: defaultHeaders }]}
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
})
