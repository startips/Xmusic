import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, View, type ViewStyle } from 'react-native'
import { useIsPlay, usePlayerMusicInfo } from '@/store/player/hook'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import Image from '@/components/common/Image'
import { M3Motion } from '@/theme/m3'
import { createStyle } from '@/utils/tools'

const ARTWORK_RADIUS = 24

export interface ArtworkCardProps {
  componentId: string
  size: number
  containerStyle?: ViewStyle
  activeElevation?: number
  pausedElevation?: number
}

/**
 * Shared album artwork card for Vertical & Horizontal PlayDetail views.
 * Keeps scale at 1.0 during push shared-element transition, then springs gently
 * between full size (playing) and slightly recessed (paused).
 */
export default memo(({
  componentId,
  size,
  containerStyle,
  activeElevation = 10,
  pausedElevation = 3,
}: ArtworkCardProps) => {
  const musicInfo = usePlayerMusicInfo()
  const isPlay = useIsPlay()
  const theme = useTheme()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)
  const scaleAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (animated) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: animated && !isPlay ? 0.92 : 1,
      ...M3Motion.spatialDefault,
    }).start()
  }, [animated, isPlay, scaleAnim])

  const imageStyle = useMemo(() => ({
    width: size,
    height: size,
    borderRadius: ARTWORK_RADIUS,
    overflow: 'hidden' as const,
  }), [size])

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View
          style={{
            ...styles.content,
            backgroundColor: theme['m3-surface-container'],
            elevation: animated ? (isPlay ? activeElevation : pausedElevation) : 0,
          }}
        >
          <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={imageStyle} />
        </View>
      </Animated.View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    borderRadius: ARTWORK_RADIUS,
    overflow: 'hidden',
  },
})
