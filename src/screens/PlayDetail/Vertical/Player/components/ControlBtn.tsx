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
  return (
    <SpringActionButton
      width={size * 0.96}
      height={size * 0.88}
      borderRadius={M3Radius.full}
      topRightRadius={18}
      bottomRightRadius={18}
      pressRadius={14}
      backgroundColor={withAlpha(theme['m3-secondary-container'], 0.9)}
      iconName="prevMusic"
      iconColor={theme['m3-on-secondary-container']}
      iconSize={size * 0.44}
      onPress={() => { void playPrev() }}
    />
  )
}

const NextBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  return (
    <SpringActionButton
      width={size * 0.96}
      height={size * 0.88}
      borderRadius={M3Radius.full}
      topLeftRadius={18}
      bottomLeftRadius={18}
      pressRadius={14}
      backgroundColor={withAlpha(theme['m3-secondary-container'], 0.9)}
      iconName="nextMusic"
      iconColor={theme['m3-on-secondary-container']}
      iconSize={size * 0.44}
      onPress={() => { void playNext() }}
    />
  )
}

const TogglePlayBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  return (
    <SpringTogglePlayButton
      width={size * 1.28}
      height={size * 1.04}
      playRadius={22}
      pauseRadius={M3Radius.full}
      isPlay={isPlay}
      backgroundColor={theme['m3-primary']}
      iconColor={theme['m3-on-primary']}
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
    gap: 26,
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: '4%',
    paddingTop: 14,
    paddingBottom: 4,
  },
})
