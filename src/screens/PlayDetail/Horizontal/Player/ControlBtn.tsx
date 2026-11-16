import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useIsPlay } from '@/store/player/hook'
import { useLayout } from '@/utils/hooks'
import { marginLeft } from '../constant'
import { BTN_WIDTH } from '../MoreBtn/Btn'
import { M3Radius, withAlpha } from '@/theme/m3'

const PrevBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const btnSize = size * 0.88
  const handlePlayPrev = () => {
    void playPrev()
  }
  return (
    <TouchableOpacity
      style={{
        ...styles.controlBtn,
        width: btnSize,
        height: btnSize,
        borderRadius: M3Radius.full,
        backgroundColor: withAlpha(theme['m3-surface-container-high'], 0.85),
      }}
      activeOpacity={0.75}
      onPress={handlePlayPrev}
    >
      <Icon name='prevMusic' color={theme['m3-on-surface']} rawSize={btnSize * 0.48} />
    </TouchableOpacity>
  )
}
const NextBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const btnSize = size * 0.88
  const handlePlayNext = () => {
    void playNext()
  }
  return (
    <TouchableOpacity
      style={{
        ...styles.controlBtn,
        width: btnSize,
        height: btnSize,
        borderRadius: M3Radius.full,
        backgroundColor: withAlpha(theme['m3-surface-container-high'], 0.85),
      }}
      activeOpacity={0.75}
      onPress={handlePlayNext}
    >
      <Icon name='nextMusic' color={theme['m3-on-surface']} rawSize={btnSize * 0.48} />
    </TouchableOpacity>
  )
}

const TogglePlayBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  return (
    <TouchableOpacity
      style={{
        ...styles.controlBtn,
        width: size * 1.15,
        height: size,
        borderRadius: isPlay ? M3Radius.lg : M3Radius.full,
        backgroundColor: theme['m3-primary-container'],
      }}
      activeOpacity={0.75}
      onPress={togglePlay}
    >
      <Icon name={isPlay ? 'pause' : 'play'} color={theme['m3-on-primary-container']} rawSize={size * 0.5} />
    </TouchableOpacity>
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
  controlBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
