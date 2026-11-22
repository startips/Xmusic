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
  return (
    <SpringActionButton
      width={size * 0.94}
      height={size * 0.84}
      borderRadius={M3Radius.full}
      topRightRadius={16}
      bottomRightRadius={16}
      pressRadius={13}
      backgroundColor={withAlpha(theme['m3-secondary-container'], 0.9)}
      iconName="prevMusic"
      iconColor={theme['m3-on-secondary-container']}
      iconSize={size * 0.42}
      onPress={() => { void playPrev() }}
    />
  )
}

const NextBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  return (
    <SpringActionButton
      width={size * 0.94}
      height={size * 0.84}
      borderRadius={M3Radius.full}
      topLeftRadius={16}
      bottomLeftRadius={16}
      pressRadius={13}
      backgroundColor={withAlpha(theme['m3-secondary-container'], 0.9)}
      iconName="nextMusic"
      iconColor={theme['m3-on-secondary-container']}
      iconSize={size * 0.42}
      onPress={() => { void playNext() }}
    />
  )
}

const TogglePlayBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  return (
    <SpringTogglePlayButton
      width={size * 1.2}
      height={size}
      playRadius={18}
      pauseRadius={M3Radius.full}
      isPlay={isPlay}
      backgroundColor={theme['m3-primary']}
      iconColor={theme['m3-on-primary']}
      iconSize={size * 0.48}
      onPress={togglePlay}
    />
  )
}

const MIN_SIZE = BTN_WIDTH * 1.15
export default () => {
  const { onLayout, height, width } = useLayout()
  const size = Math.max(Math.min(height * 0.62, (width - marginLeft) * 0.52 * 0.3) * global.lx.fontSize, MIN_SIZE)
  return (
    <View style={{ ...styles.content, gap: Math.max(size * 0.34, 20) }} onLayout={onLayout}>
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
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
