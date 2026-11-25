import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { View, PanResponder } from 'react-native'
import { useDrag } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useIsPlay } from '@/store/player/hook'
import { withAlpha } from '@/theme/m3'
import WavyProgressBar from './WavyProgressBar'

const PreassBar = memo(({ onDragState, setDragProgress, onSetProgress }: {
  onDragState: (drag: boolean) => void
  setDragProgress: (progress: number) => void
  onSetProgress: (progress: number) => void
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

  return <View onLayout={onLayout} style={styles.pressBar} {...panResponder.panHandlers} />
})

export const ProgressPlain = ({ progress, buffered, active = true }: {
  progress: number
  duration: number
  buffered: number
  active?: boolean
}) => {
  const theme = useTheme()
  const isPlay = useIsPlay()

  return (
    <View pointerEvents="none" style={styles.progress}>
      <WavyProgressBar
        progress={progress}
        buffered={buffered}
        playing={isPlay && active}
        dragging={false}
        activeColor={theme['m3-primary']}
        bufferedColor={withAlpha(theme['m3-primary'], 0.30)}
        trackColor={withAlpha(theme['m3-on-surface'], theme.isDark ? 0.16 : 0.12)}
        amplitude={1.15}
        wavelength={24}
        waveSpeed={1.8}
        strokeWidth={2.5}
        inactiveStrokeWidth={2.5}
        showThumb={false}
        style={styles.wavyBar}
      />
    </View>
  )
}

const Progress = ({ progress, duration, buffered, active = true }: {
  progress: number
  duration: number
  buffered: number
  active?: boolean
}) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  const [draging, setDraging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)

  const durationRef = useRef(duration)
  useEffect(() => {
    durationRef.current = duration
  }, [duration])
  const onSetProgress = useCallback((nextProgress: number) => {
    global.app_event.setProgress(nextProgress * durationRef.current)
  }, [])

  return (
    <View style={styles.progress}>
      <WavyProgressBar
        pointerEvents="none"
        progress={draging ? dragProgress : progress}
        buffered={buffered}
        playing={isPlay && active && !draging}
        dragging={draging}
        activeColor={theme['m3-primary']}
        bufferedColor={withAlpha(theme['m3-primary'], 0.30)}
        trackColor={withAlpha(theme['m3-on-surface'], theme.isDark ? 0.16 : 0.12)}
        amplitude={1.15}
        wavelength={24}
        waveSpeed={1.8}
        strokeWidth={2.5}
        inactiveStrokeWidth={2.5}
        showThumb={false}
        style={styles.wavyBar}
      />
      <PreassBar onDragState={setDraging} setDragProgress={setDragProgress} onSetProgress={onSetProgress} />
    </View>
  )
}

const styles = createStyle({
  progress: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  wavyBar: {
    width: '100%',
    height: '100%',
  },
  pressBar: {
    position: 'absolute',
    left: 0,
    top: -6,
    bottom: -6,
    width: '100%',
  },
})

export default Progress
