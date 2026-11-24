import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Keyboard, StyleSheet, TouchableOpacity, View } from 'react-native'
import { navigations } from '@/navigation'
import {
  registerActivePlayerBarBouncer,
  registerActivePlayerBarMeasurer,
  setPlayerBarPicRect,
  unregisterActivePlayerBarBouncer,
  unregisterActivePlayerBarMeasurer,
} from '@/navigation/playerBarTarget'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useComponentIds, useNavActiveId, useNavigationBarHeight } from '@/store/common/hook'
import { useWindowSize } from '@/utils/hooks'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { COMPONENT_IDS, LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'

const PIC_HEIGHT = scaleSizeH(44)

const styles = StyleSheet.create({
  image: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
})

export const getTopPlayerBarHostComponentId = () => {
  return commonState.componentIds.songlistDetail ??
    commonState.componentIds.setting ??
    commonState.componentIds.home!
}

export default ({ isHome, hostScreen }: { isHome: boolean, hostScreen?: COMPONENT_IDS }) => {
  const musicInfo = usePlayerMusicInfo()
  const winSize = useWindowSize()
  const navActiveId = useNavActiveId()
  const navBarHeight = useNavigationBarHeight()
  const componentIds = useComponentIds()
  const picWrapRef = useRef<View>(null)
  const bounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bounceScale = useRef(new Animated.Value(1)).current
  const bounceRotate = useRef(new Animated.Value(0)).current

  const resolvedHost = hostScreen ?? (isHome ? COMPONENT_IDS.home : undefined)
  let isPlayDetailHost = false
  if (resolvedHost === COMPONENT_IDS.home) {
    isPlayDetailHost = !componentIds.songlistDetail && !componentIds.setting
  } else if (resolvedHost === COMPONENT_IDS.songlistDetail) {
    isPlayDetailHost = Boolean(componentIds.songlistDetail) && !componentIds.setting
  } else if (resolvedHost === COMPONENT_IDS.setting) {
    isPlayDetailHost = Boolean(componentIds.setting)
  }

  const isForegroundHost = isPlayDetailHost && !componentIds.playDetail && !componentIds.comment
  const isForegroundHostRef = useRef(isForegroundHost)
  isForegroundHostRef.current = isForegroundHost

  const rotateInterpolate = useMemo(() => bounceRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-6deg', '0deg', '6deg'],
  }), [bounceRotate])

  const measurePic = useCallback(() => {
    if (!isForegroundHostRef.current) return
    if (typeof Keyboard.isVisible === 'function' && Keyboard.isVisible()) return
    picWrapRef.current?.measureInWindow((x, y, width, height) => {
      if (!isForegroundHostRef.current) return
      if (typeof Keyboard.isVisible === 'function' && Keyboard.isVisible()) return
      if (width > 0 && height > 0) {
        setPlayerBarPicRect({ x, y, width, height })
      }
    })
  }, [])

  const playBounce = useCallback(() => {
    if (bounceTimerRef.current) {
      clearTimeout(bounceTimerRef.current)
      bounceTimerRef.current = null
    }
    bounceTimerRef.current = setTimeout(() => {
      bounceTimerRef.current = null
      bounceScale.stopAnimation()
      bounceRotate.stopAnimation()
      bounceScale.setValue(1)
      bounceRotate.setValue(0)
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bounceScale, {
            toValue: 0.84,
            duration: 75,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(bounceScale, {
            toValue: 1,
            damping: 7.5,
            stiffness: 320,
            mass: 0.65,
            velocity: 4.5,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(bounceRotate, {
            toValue: -1,
            duration: 65,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounceRotate, {
            toValue: 0.75,
            duration: 85,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounceRotate, {
            toValue: -0.35,
            duration: 75,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(bounceRotate, {
            toValue: 0,
            damping: 10,
            stiffness: 300,
            mass: 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]).start()
    }, 300)
  }, [bounceRotate, bounceScale])

  useEffect(() => {
    if (!isPlayDetailHost) return
    registerActivePlayerBarBouncer(playBounce)
    return () => {
      if (bounceTimerRef.current) {
        clearTimeout(bounceTimerRef.current)
        bounceTimerRef.current = null
      }
      unregisterActivePlayerBarBouncer(playBounce)
    }
  }, [isPlayDetailHost, playBounce])

  useEffect(() => {
    if (!isForegroundHost) return
    registerActivePlayerBarMeasurer(measurePic)
    const timer = setTimeout(measurePic, 80)
    const settleTimer = !isHome ? setTimeout(measurePic, 360) : null
    return () => {
      clearTimeout(timer)
      if (settleTimer) clearTimeout(settleTimer)
      unregisterActivePlayerBarMeasurer(measurePic)
    }
  }, [isForegroundHost, isHome, measurePic, winSize.width, winSize.height, navActiveId, navBarHeight])

  const handlePress = () => {
    if (!musicInfo.id) return
    measurePic()
    navigations.pushPlayDetailScreen(getTopPlayerBarHostComponentId())
  }

  const handleLongPress = () => {
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const handleError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({
      pic: null,
    })
  }, [])

  return (
    <TouchableOpacity onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7}>
      <View ref={picWrapRef} collapsable={false} onLayout={measurePic}>
        <Animated.View style={{ transform: [{ scale: bounceScale }, { rotate: rotateInterpolate }] }}>
          <Image
            url={musicInfo.pic}
            nativeID={isPlayDetailHost ? NAV_SHEAR_NATIVE_IDS.playDetail_pic : undefined}
            style={styles.image}
            onError={handleError}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  )
}
