import { useRef } from 'react'
import { Animated, Pressable, TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useIsPlay } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { createStyle } from '@/utils/tools'
import { useHorizontalMode } from '@/utils/hooks'
import { M3Motion, M3Radius } from '@/theme/m3'

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
    <TouchableOpacity style={styles.controlBtn} activeOpacity={0.65} onPress={handlePlayPrev}>
      <Icon name='prevMusic' color={theme['m3-on-surface']} size={BTN_SIZE} />
    </TouchableOpacity>
  )
}

const PlayNextBtn = () => {
  const theme = useTheme()

  return (
    <TouchableOpacity style={styles.controlBtn} activeOpacity={0.65} onPress={handlePlayNext}>
      <Icon name='nextMusic' color={theme['m3-on-surface']} size={BTN_SIZE} />
    </TouchableOpacity>
  )
}

const TogglePlayBtn = () => {
  const isPlay = useIsPlay()
  const theme = useTheme()
  const pressScale = useRef(new Animated.Value(1)).current

  return (
    <Pressable
      onPress={togglePlay}
      onPressIn={() => { M3Motion.pressSpring(pressScale, 0.88).start() }}
      onPressOut={() => { M3Motion.pressSpring(pressScale, 1).start() }}
    >
      <Animated.View
        style={{
          ...styles.playBtn,
          backgroundColor: theme['m3-primary-container'],
          borderRadius: isPlay ? M3Radius.sm : M3Radius.full,
          transform: [{ scale: pressScale }],
        }}
      >
        <Icon name={isPlay ? 'pause' : 'play'} color={theme['m3-on-primary-container']} size={PLAY_ICON_SIZE} />
      </Animated.View>
    </Pressable>
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
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
