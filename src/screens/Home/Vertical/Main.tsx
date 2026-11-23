import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Search from '../Views/Search'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import Leaderboard from '../Views/Leaderboard'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { createStyle } from '@/utils/tools'
import PagerView, {
  type PageScrollStateChangedNativeEvent,
  type PagerViewOnPageScrollEvent,
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view'
import { setNavActiveId } from '@/core/common'
import settingState from '@/store/setting/state'
import {
  HOME_NAV_IDS,
  HOME_NAV_INDEX_MAP,
  animateHomePillToIndex,
  homeSwipeProgress,
  stopHomePillAnimation,
  syncHomePagerGestureProgress,
} from './pagerMotion'

type NavId = CommonState['navActiveId']

interface HomePageSlotRef {
  runEnter: (direction: 1 | -1) => void
  resetEnter: () => void
}

const EMPHASIZED_DECEL = Easing.bezier(0.05, 0.7, 0.1, 1.0)
const FADE_IN_EASE = Easing.out(Easing.cubic)

const HomePageSlot = memo(forwardRef<HomePageSlotRef, {
  index: number
  mounted: boolean
  id: NavId
}>(({ index, mounted, id }, ref) => {
  const tapTranslateX = useRef(new Animated.Value(0)).current
  const tapScale = useRef(new Animated.Value(1)).current
  const tapOpacity = useRef(new Animated.Value(1)).current

  const swipeScale = useMemo(() => homeSwipeProgress.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0.96, 1, 0.96],
    extrapolate: 'clamp',
  }), [index])

  const swipeOpacity = useMemo(() => homeSwipeProgress.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0.76, 1, 0.76],
    extrapolate: 'clamp',
  }), [index])

  const combinedOpacity = useMemo(
    () => Animated.multiply(swipeOpacity, tapOpacity),
    [swipeOpacity, tapOpacity],
  )

  const resetEnter = useCallback(() => {
    tapTranslateX.stopAnimation()
    tapScale.stopAnimation()
    tapOpacity.stopAnimation()
    tapTranslateX.setValue(0)
    tapScale.setValue(1)
    tapOpacity.setValue(1)
  }, [tapOpacity, tapScale, tapTranslateX])

  const runEnter = useCallback((direction: 1 | -1) => {
    tapTranslateX.stopAnimation()
    tapScale.stopAnimation()
    tapOpacity.stopAnimation()
    tapTranslateX.setValue(direction * 30)
    tapScale.setValue(0.982)
    tapOpacity.setValue(0)
    Animated.parallel([
      Animated.timing(tapTranslateX, {
        toValue: 0,
        duration: 240,
        easing: EMPHASIZED_DECEL,
        useNativeDriver: true,
      }),
      Animated.timing(tapScale, {
        toValue: 1,
        duration: 240,
        easing: EMPHASIZED_DECEL,
        useNativeDriver: true,
      }),
      Animated.timing(tapOpacity, {
        toValue: 1,
        duration: 185,
        easing: FADE_IN_EASE,
        useNativeDriver: true,
      }),
    ]).start()
  }, [tapOpacity, tapScale, tapTranslateX])

  useImperativeHandle(ref, () => ({
    runEnter,
    resetEnter,
  }), [resetEnter, runEnter])

  const content = useMemo(() => {
    if (!mounted) return null
    switch (id) {
      case 'nav_songlist': return <SongList />
      case 'nav_top': return <Leaderboard />
      case 'nav_love': return <Mylist />
      case 'nav_search':
      default: return <Search />
    }
  }, [id, mounted])

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: combinedOpacity,
        transform: [
          { translateX: tapTranslateX },
          { scale: swipeScale },
          { scale: tapScale },
        ],
      }}
    >
      {content}
    </Animated.View>
  )
}))

const Main = () => {
  const pagerViewRef = useRef<ComponentRef<typeof PagerView>>(null)
  const initialIndex = HOME_NAV_INDEX_MAP[commonState.navActiveId] ?? 0
  const activeIndexRef = useRef<number>(initialIndex)
  const scrollStateRef = useRef<'idle' | 'dragging' | 'settling'>('idle')
  const slotRefs = useRef<Array<HomePageSlotRef | null>>([null, null, null, null])

  const [mountedMap, setMountedMap] = useState<Partial<Record<NavId, boolean>>>(() => ({
    [commonState.navActiveId]: true,
  }))
  const mountedMapRef = useRef<Partial<Record<NavId, boolean>>>({ [commonState.navActiveId]: true })

  const ensureMounted = useCallback((ids: NavId[]) => {
    let needsUpdate = false
    for (const id of ids) {
      if (!mountedMapRef.current[id]) {
        needsUpdate = true
        break
      }
    }
    if (!needsUpdate) return
    setMountedMap((prev) => {
      let changed = false
      for (const id of ids) {
        if (!prev[id]) {
          changed = true
          break
        }
      }
      if (!changed) return prev
      const next = { ...prev }
      for (const id of ids) next[id] = true
      mountedMapRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    syncHomePagerGestureProgress(activeIndexRef.current)
    const timer = setTimeout(() => {
      const idx = activeIndexRef.current
      const neighbors: NavId[] = []
      if (idx > 0) neighbors.push(HOME_NAV_IDS[idx - 1])
      if (idx + 1 < HOME_NAV_IDS.length) neighbors.push(HOME_NAV_IDS[idx + 1])
      if (neighbors.length) ensureMounted(neighbors)
    }, 600)
    return () => {
      clearTimeout(timer)
    }
  }, [ensureMounted])

  const onPageScroll = useCallback(({ nativeEvent }: PagerViewOnPageScrollEvent) => {
    const { position, offset } = nativeEvent
    if (offset > 0.01) {
      const candidates: NavId[] = []
      const cur = HOME_NAV_IDS[position]
      const next = HOME_NAV_IDS[position + 1]
      if (cur) candidates.push(cur)
      if (next) candidates.push(next)
      if (candidates.length) ensureMounted(candidates)
    }
    if (scrollStateRef.current !== 'idle') {
      syncHomePagerGestureProgress(position + offset)
    }
  }, [ensureMounted])

  const onPageSelected = useCallback(({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    const pos = nativeEvent.position
    const nextId = HOME_NAV_IDS[pos]
    if (nextId) ensureMounted([nextId])
    if (nextId && pos != HOME_NAV_INDEX_MAP[commonState.navActiveId]) {
      activeIndexRef.current = pos
      setNavActiveId(nextId)
    } else {
      activeIndexRef.current = pos
    }
  }, [ensureMounted])

  const onPageScrollStateChanged = useCallback(({ nativeEvent }: PageScrollStateChangedNativeEvent) => {
    const state = nativeEvent.pageScrollState
    scrollStateRef.current = state
    const idle = state == 'idle'
    if (global.lx.homePagerIdle != idle) global.lx.homePagerIdle = idle
    if (state === 'dragging') {
      stopHomePillAnimation()
      slotRefs.current[activeIndexRef.current]?.resetEnter()
    } else if (state === 'idle') {
      syncHomePagerGestureProgress(activeIndexRef.current)
    }
  }, [])

  useEffect(() => {
    const handleUpdate = (id: NavId) => {
      const nextIndex = HOME_NAV_INDEX_MAP[id]
      if (nextIndex == null) return
      ensureMounted([id])
      if (activeIndexRef.current == nextIndex) return
      const direction: 1 | -1 = nextIndex > activeIndexRef.current ? 1 : -1
      slotRefs.current[activeIndexRef.current]?.resetEnter()
      activeIndexRef.current = nextIndex
      animateHomePillToIndex(nextIndex)
      pagerViewRef.current?.setPageWithoutAnimation(nextIndex)
      slotRefs.current[nextIndex]?.runEnter(direction)
    }
    const handleConfigUpdate = (keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) => {
      if (!keys.includes('common.homePageScroll')) return
      pagerViewRef.current?.setScrollEnabled(setting['common.homePageScroll']!)
    }
    global.state_event.on('navActiveIdUpdated', handleUpdate)
    global.state_event.on('configUpdated', handleConfigUpdate)
    return () => {
      global.state_event.off('navActiveIdUpdated', handleUpdate)
      global.state_event.off('configUpdated', handleConfigUpdate)
    }
  }, [ensureMounted])

  return (
    <PagerView
      ref={pagerViewRef}
      initialPage={initialIndex}
      offscreenPageLimit={3}
      onPageScroll={onPageScroll}
      onPageSelected={onPageSelected}
      onPageScrollStateChanged={onPageScrollStateChanged}
      scrollEnabled={settingState.setting['common.homePageScroll']}
      style={styles.pagerView}
    >
      {HOME_NAV_IDS.map((id, index) => (
        <View collapsable={false} key={id} style={styles.pageStyle}>
          <HomePageSlot
            ref={(el) => { slotRefs.current[index] = el }}
            index={index}
            id={id}
            mounted={Boolean(mountedMap[id])}
          />
        </View>
      ))}
    </PagerView>
  )
}

const styles = createStyle({
  pagerView: {
    flex: 1,
    overflow: 'hidden',
  },
  pageStyle: {
    flex: 1,
  },
})

export default Main


