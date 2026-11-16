import { useMemo, useRef } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useIsPlay } from '@/store/player/hook'
import { createStyle } from '@/utils/tools'
import { useWindowSize } from '@/utils/hooks'
import { BTN_WIDTH } from './MoreBtn/Btn'
import { M3Motion, M3Radius, withAlpha } from '@/theme/m3'

const SpringActionButton = ({
  width,
  height,
  borderRadius,
  backgroundColor,
  iconName,
  iconColor,
  iconSize,
  onPress,
}: {
  width: number
  height: number
  borderRadius: number
  backgroundColor: string
  iconName: string
  iconColor: string
  iconSize: number
  onPress: () => void
}) => {
  const pressScale = useRef(new Animated.Value(1)).current

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { M3Motion.pressSpring(pressScale, 0.9).start() }}
      onPressOut={() => { M3Motion.pressSpring(pressScale, 1).start() }}
    >
      <Animated.View
        style={{
          ...styles.controlBtn,
          width,
          height,
          borderRadius,
          backgroundColor,
          transform: [{ scale: pressScale }],
        }}
      >
        <Icon name={iconName} color={iconColor} rawSize={iconSize} />
      </Animated.View>
    </Pressable>
  )
}

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
    <SpringActionButton
      width={size * 1.18}
      height={size}
      borderRadius={isPlay ? M3Radius.lg : M3Radius.full}
      backgroundColor={theme['m3-primary-container']}
      iconName={isPlay ? 'pause' : 'play'}
      iconColor={theme['m3-on-primary-container']}
      iconSize={size * 0.5}
      onPress={togglePlay}
    />
  )
}

const MAX_SIZE = BTN_WIDTH * 1.75
const MIN_SIZE = BTN_WIDTH * 1.35

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
    paddingVertical: 18,
  },
  controlBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
