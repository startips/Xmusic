import { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useIsPlay } from '@/store/player/hook'
import { createStyle } from '@/utils/tools'
import { useWindowSize } from '@/utils/hooks'
import { scaleSizeW } from '@/utils/pixelRatio'
import { M3Radius, withAlpha } from '@/theme/m3'
import { SpringActionButton, SpringTogglePlayButton } from '@/components/player/SpringControlButton'

const PrevBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const btnSize = size * 0.86
  return (
    <SpringActionButton
      width={btnSize}
      height={btnSize}
      borderRadius={M3Radius.full}
      backgroundColor={withAlpha(theme['m3-surface-container-high'], 0.85)}
      iconName="prevMusic"
      iconColor={theme['m3-on-surface']}
      iconSize={btnSize * 0.48}
      onPress={() => { void playPrev() }}
    />
  )
}

const NextBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const btnSize = size * 0.86
  return (
    <SpringActionButton
      width={btnSize}
      height={btnSize}
      borderRadius={M3Radius.full}
      backgroundColor={withAlpha(theme['m3-surface-container-high'], 0.85)}
      iconName="nextMusic"
      iconColor={theme['m3-on-surface']}
      iconSize={btnSize * 0.48}
      onPress={() => { void playNext() }}
    />
  )
}

const TogglePlayBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  return (
    <SpringTogglePlayButton
      width={size * 1.18}
      height={size}
      playRadius={M3Radius.lg}
      pauseRadius={M3Radius.full}
      isPlay={isPlay}
      backgroundColor={theme['m3-primary-container']}
      iconColor={theme['m3-on-primary-container']}
      iconSize={size * 0.5}
      onPress={togglePlay}
    />
  )
}

const BASE_PLAY_SIZE = scaleSizeW(42)
const MAX_SIZE = BASE_PLAY_SIZE * 1.75
const MIN_SIZE = BASE_PLAY_SIZE * 1.35

export default () => {
  const winSize = useWindowSize()
  const maxHeight = Math.max(winSize.height * 0.12, MIN_SIZE)
  const containerStyle = useMemo(() => {
    return {
      ...styles.conatiner,
      maxHeight,
    }
  }, [maxHeight])
  const size = Math.min(Math.max(winSize.width * 0.33 * global.lx.fontSize * 0.4, MIN_SIZE), MAX_SIZE, maxHeight)

  return (
    <View style={containerStyle}>
      <PrevBtn size={size} />
      <TogglePlayBtn size={size} />
      <NextBtn size={size} />
    </View>
  )
}

const styles = createStyle({
  conatiner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: '4%',
    paddingVertical: 12,
  },
})
