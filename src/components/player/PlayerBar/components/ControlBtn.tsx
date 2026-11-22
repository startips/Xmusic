import { useIsPlay } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useHorizontalMode } from '@/utils/hooks'
import { SpringActionButton, SpringTogglePlayButton } from '@/components/player/SpringControlButton'

const PLAY_ICON_SIZE = 17
const SKIP_ICON_SIZE = 18
const handlePlayPrev = () => {
  void playPrev()
}
const handlePlayNext = () => {
  void playNext()
}

const PlayPrevBtn = () => {
  const theme = useTheme()

  return (
    <SpringActionButton
      width={36}
      height={36}
      borderRadius={18}
      topRightRadius={10}
      bottomRightRadius={10}
      pressRadius={10}
      backgroundColor={theme['m3-secondary-container']}
      iconName="prevMusic"
      iconColor={theme['m3-on-secondary-container']}
      iconSize={SKIP_ICON_SIZE}
      onPress={handlePlayPrev}
    />
  )
}

const PlayNextBtn = () => {
  const theme = useTheme()

  return (
    <SpringActionButton
      width={36}
      height={36}
      borderRadius={18}
      topLeftRadius={10}
      bottomLeftRadius={10}
      pressRadius={10}
      backgroundColor={theme['m3-secondary-container']}
      iconName="nextMusic"
      iconColor={theme['m3-on-secondary-container']}
      iconSize={SKIP_ICON_SIZE}
      onPress={handlePlayNext}
    />
  )
}

const TogglePlayBtn = () => {
  const isPlay = useIsPlay()
  const theme = useTheme()

  return (
    <SpringTogglePlayButton
      width={40}
      height={36}
      playRadius={10}
      pauseRadius={18}
      isPlay={isPlay}
      backgroundColor={theme['m3-primary']}
      iconColor={theme['m3-on-primary']}
      iconSize={PLAY_ICON_SIZE}
      onPress={togglePlay}
    />
  )
}

export default () => {
  const isHorizontalMode = useHorizontalMode()
  return (
    <>
      {isHorizontalMode ? <PlayPrevBtn /> : null}
      <TogglePlayBtn />
      <PlayNextBtn />
    </>
  )
}
