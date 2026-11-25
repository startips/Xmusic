import { memo } from 'react'
import { Platform, UIManager, View, requireNativeComponent, type ViewProps } from 'react-native'

export interface WavyProgressBarProps extends ViewProps {
  progress: number
  buffered?: number
  playing?: boolean
  dragging?: boolean
  activeColor: string
  bufferedColor: string
  trackColor: string
  amplitude?: number
  wavelength?: number
  waveSpeed?: number
  strokeWidth?: number
  inactiveStrokeWidth?: number
  showThumb?: boolean
  thumbGap?: number
  thumbWidth?: number
  thumbHeight?: number
}

interface NativeWavyProgressProps extends ViewProps {
  progress: number
  buffered: number
  playing: boolean
  dragging: boolean
  activeColor: string
  bufferedColor: string
  trackColor: string
  amplitude: number
  wavelength: number
  waveSpeed: number
  strokeWidth: number
  inactiveStrokeWidth: number
  showThumb: boolean
  thumbGap: number
  thumbWidth: number
  thumbHeight: number
}

const COMPONENT_NAME = 'XmusicWavyProgressView'

const NativeWavyProgressView = Platform.OS === 'android' && UIManager.getViewManagerConfig(COMPONENT_NAME) != null
  ? requireNativeComponent<NativeWavyProgressProps>(COMPONENT_NAME)
  : null

const clamp01 = (v: number): number => {
  if (!Number.isFinite(v) || v <= 0) return 0
  if (v >= 1) return 1
  return v
}

export default memo(({
  progress,
  buffered = 0,
  playing = false,
  dragging = false,
  activeColor,
  bufferedColor,
  trackColor,
  amplitude = 2.3,
  wavelength = 34,
  waveSpeed = 1.8,
  strokeWidth = 3.4,
  inactiveStrokeWidth = 3,
  showThumb = true,
  thumbGap = 5.5,
  thumbWidth = 4.5,
  thumbHeight = 17,
  style,
  ...rest
}: WavyProgressBarProps) => {
  const safeProgress = clamp01(progress)
  const safeBuffered = clamp01(buffered)

  if (NativeWavyProgressView) {
    return (
      <NativeWavyProgressView
        {...rest}
        progress={safeProgress}
        buffered={safeBuffered}
        playing={playing}
        dragging={dragging}
        activeColor={activeColor}
        bufferedColor={bufferedColor}
        trackColor={trackColor}
        amplitude={amplitude}
        wavelength={wavelength}
        waveSpeed={waveSpeed}
        strokeWidth={strokeWidth}
        inactiveStrokeWidth={inactiveStrokeWidth}
        showThumb={showThumb}
        thumbGap={thumbGap}
        thumbWidth={thumbWidth}
        thumbHeight={thumbHeight}
        style={style}
      />
    )
  }

  const pct: `${number}%` = `${safeProgress * 100}%`
  const bufPct: `${number}%` = `${Math.max(safeProgress, safeBuffered) * 100}%`

  return (
    <View
      {...rest}
      style={[
        { justifyContent: 'center' },
        style,
      ]}
    >
      <View
        style={{
          height: inactiveStrokeWidth,
          borderRadius: inactiveStrokeWidth / 2,
          backgroundColor: trackColor,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: bufPct,
            backgroundColor: bufferedColor,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: pct,
            backgroundColor: activeColor,
          }}
        />
      </View>
      {showThumb
        ? (
            <View
              style={{
                position: 'absolute',
                left: pct,
                width: thumbWidth,
                height: thumbHeight,
                marginLeft: -thumbWidth / 2,
                borderRadius: thumbWidth / 2,
                backgroundColor: activeColor,
              }}
            />
          )
        : null}
    </View>
  )
})
