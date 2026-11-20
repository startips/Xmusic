import { Pressable, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useIsPlay } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { createStyle } from '@/utils/tools'
import { useHorizontalMode } from '@/utils/hooks'
import { M3Radius, withAlpha } from '@/theme/m3'
import { SpringTogglePlayButton } from '@/components/player/SpringControlButton'

const BTN_SIZE = 20
const PLAY_ICON_SIZE = 18
const handlePlayPrev = () => {
  void playPrev()
}
const handlePlayNext = () => {
  void playNext()
}

const PlayPrevBtn = () => {
  const theme = useTheme()

  return (
    <View style={styles.controlBtnWrap}>
      <Pressable
        style={styles.controlBtn}
        android_ripple={{ color: withAlpha(theme['m3-primary'], 0.16), borderless: true }}
        onPress={handlePlayPrev}
      >
        <Icon name="prevMusic" color={theme['m3-on-surface']} size={BTN_SIZE} />
      </Pressable>
    </View>
  )
}

const PlayNextBtn = () => {
  const theme = useTheme()

  return (
    <View style={styles.controlBtnWrap}>
      <Pressable
        style={styles.controlBtn}
        android_ripple={{ color: withAlpha(theme['m3-primary'], 0.16), borderless: true }}
        onPress={handlePlayNext}
      >
        <Icon name="nextMusic" color={theme['m3-on-surface']} size={BTN_SIZE} />
      </Pressable>
    </View>
  )
}

const TogglePlayBtn = () => {
  const isPlay = useIsPlay()
  const theme = useTheme()

  return (
    <SpringTogglePlayButton
      width={38}
      height={38}
      playRadius={M3Radius.sm}
      pauseRadius={M3Radius.full}
      isPlay={isPlay}
      backgroundColor={theme['m3-primary-container']}
      iconColor={theme['m3-on-primary-container']}
      iconSize={PLAY_ICON_SIZE}
      onPress={togglePlay}
    />
  )
}

export default () => {
  const isHorizontalMode = useHorizontalMode()
  return (
    <>
      { isHorizontalMode ? <PlayPrevBtn /> : null }
      <TogglePlayBtn />
      <PlayNextBtn />
    </>
  )
}

const styles = createStyle({
  controlBtnWrap: {
    width: 38,
    height: 38,
    borderRadius: M3Radius.full,
    overflow: 'hidden',
  },
  controlBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
