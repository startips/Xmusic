import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useIsPlay } from '@/store/player/hook'
import { useLayout } from '@/utils/hooks'
import { marginLeft } from '../constant'
import { BTN_WIDTH } from '../MoreBtn/Btn'
import { M3Radius, withAlpha } from '@/theme/m3'
import { SpringActionButton, SpringTogglePlayButton } from '@/components/player/SpringControlButton'

const PrevBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const btnSize = size * 0.88
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
  const btnSize = size * 0.88
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
      width={size * 1.15}
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

const MIN_SIZE = BTN_WIDTH * 1.15
export default () => {
  const { onLayout, height, width } = useLayout()
  const size = Math.max(Math.min(height * 0.62, (width - marginLeft) * 0.52 * 0.3) * global.lx.fontSize, MIN_SIZE)
  return (
    <View style={{ ...styles.content, gap: Math.max(size * 0.35, 14) }} onLayout={onLayout}>
      <PrevBtn size={size} />
      <TogglePlayBtn size={size} />
      <NextBtn size={size} />
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
