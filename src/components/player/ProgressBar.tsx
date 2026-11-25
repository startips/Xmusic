import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { View, PanResponder, type LayoutChangeEvent } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useIsPlay } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { useDrag } from '@/utils/hooks'
import { formatPlayTime2 } from '@/utils/common'
import { M3Radius, withAlpha } from '@/theme/m3'
import Text from '@/components/common/Text'
import WavyProgressBar from './WavyProgressBar'

const TOOLTIP_WIDTH = 56

const PreassBar = memo(({ onDragState, setDragProgress, onSetProgress, onMeasureWidth }: {
  onDragState: (drag: boolean) => void
  setDragProgress: (progress: number) => void
  onSetProgress: (progress: number) => void
  onMeasureWidth: (width: number) => void
}) => {
  const {
    onLayout,
    onDragStart,
    onDragEnd,
    onDragCancel,
    onDrag,
  } = useDrag(onSetProgress, onDragState, setDragProgress)

  const handlersRef = useRef({ onDragStart, onDragEnd, onDragCancel, onDrag })
  handlersRef.current = { onDragStart, onDragEnd, onDragCancel, onDrag }

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    onLayout(e)
    onMeasureWidth(e.nativeEvent.layout.width)
  }, [onLayout, onMeasureWidth])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evt, gestureState) => {
        handlersRef.current.onDrag(gestureState.dx)
      },
      onPanResponderGrant: (evt, gestureState) => {
        handlersRef.current.onDragStart(gestureState.dx, evt.nativeEvent.locationX)
      },
      onPanResponderRelease: () => {
        handlersRef.current.onDragEnd()
      },
      onPanResponderTerminate: () => {
        handlersRef.current.onDragCancel()
      },
    }),
  ).current

  return <View onLayout={handleLayout} style={styles.pressBar} {...panResponder.panHandlers} />
})

const Progress = ({ progress, duration, buffered }: {
  progress: number
  duration: number
  buffered: number
}) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  const [draging, setDraging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)
  const [barWidth, setBarWidth] = useState(0)

  const durationRef = useRef(duration)
  useEffect(() => {
    durationRef.current = duration
  }, [duration])
  const onSetProgress = useCallback((nextProgress: number) => {
    global.app_event.setProgress(nextProgress * durationRef.current)
  }, [])

  const displayProgress = draging ? dragProgress : progress
  const halfTooltip = TOOLTIP_WIDTH / 2
  const tooltipLeft = barWidth > TOOLTIP_WIDTH
    ? Math.max(0, Math.min(barWidth - TOOLTIP_WIDTH, displayProgress * barWidth - halfTooltip))
    : 0

  return (
    <View style={styles.progress}>
      {draging && barWidth > 0 && duration > 0
        ? (
            <View
              pointerEvents="none"
              style={{
                ...styles.tooltip,
                left: tooltipLeft,
                backgroundColor: theme['m3-primary'],
              }}
            >
              <Text size={11} color={theme['m3-on-primary']} style={styles.tooltipText}>
                {formatPlayTime2(Math.max(0, displayProgress * duration))}
              </Text>
            </View>
          )
        : null}
      <WavyProgressBar
        pointerEvents="none"
        progress={displayProgress}
        buffered={buffered}
        playing={isPlay && !draging}
        dragging={draging}
        activeColor={theme['m3-primary']}
        bufferedColor={withAlpha(theme['m3-primary'], 0.28)}
        trackColor={withAlpha(theme['m3-surface-container-highest'], 0.92)}
        amplitude={2.3}
        wavelength={34}
        waveSpeed={1.8}
        strokeWidth={3.4}
        inactiveStrokeWidth={3}
        showThumb={true}
        thumbGap={5.5}
        thumbWidth={4.5}
        thumbHeight={17}
        style={styles.wavyBar}
      />
      <PreassBar
        onDragState={setDraging}
        setDragProgress={setDragProgress}
        onSetProgress={onSetProgress}
        onMeasureWidth={setBarWidth}
      />
    </View>
  )
}

const progressContentHeight = 28
const styles = createStyle({
  progress: {
    width: '100%',
    height: progressContentHeight,
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  wavyBar: {
    width: '100%',
    height: 24,
  },
  tooltip: {
    position: 'absolute',
    top: -scaleSizeH(22),
    width: TOOLTIP_WIDTH,
    paddingVertical: 2,
    borderRadius: M3Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
  },
  tooltipText: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  pressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: progressContentHeight,
    width: '100%',
    zIndex: 6,
  },
})

export default Progress
