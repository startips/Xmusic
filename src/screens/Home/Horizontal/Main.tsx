import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Search from '../Views/Search'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import Leaderboard from '../Views/Leaderboard'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import {
  HOME_NAV_IDS,
  HOME_NAV_INDEX_MAP,
  animateHomePillToIndex,
} from '../Vertical/pagerMotion'

type NavId = CommonState['navActiveId']

const EMPHASIZED_DECEL = Easing.bezier(0.05, 0.7, 0.1, 1.0)
const FADE_IN_EASE = Easing.out(Easing.cubic)

const HorizontalSlot = memo(({
  id,
  mounted,
  active,
  direction,
}: {
  id: NavId
  mounted: boolean
  active: boolean
  direction: 1 | -1
}) => {
  const wasActiveRef = useRef(active)
  const translateY = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current

  useLayoutEffect(() => {
    const prevActive = wasActiveRef.current
    wasActiveRef.current = active
    if (active && !prevActive) {
      translateY.stopAnimation()
      scale.stopAnimation()
      opacity.stopAnimation()
      translateY.setValue(direction * 20)
      scale.setValue(0.985)
      opacity.setValue(0)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: EMPHASIZED_DECEL,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 220,
          easing: EMPHASIZED_DECEL,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 170,
          easing: FADE_IN_EASE,
          useNativeDriver: true,
        }),
      ]).start()
    } else if (!active && prevActive) {
      translateY.stopAnimation()
      scale.stopAnimation()
      opacity.stopAnimation()
      opacity.setValue(0)
    }
  }, [active, direction, opacity, scale, translateY])

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
    <View
      pointerEvents={active ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        { opacity: active ? 1 : 0, zIndex: active ? 1 : 0 },
      ]}
    >
      <Animated.View
        style={{
          flex: 1,
          opacity,
          transform: [{ translateY }, { scale }],
        }}
      >
        {content}
      </Animated.View>
    </View>
  )
})

const Main = () => {
  const [activeId, setActiveId] = useState<NavId>(commonState.navActiveId)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [mountedMap, setMountedMap] = useState<Partial<Record<NavId, boolean>>>(() => ({
    [commonState.navActiveId]: true,
  }))
  const prevIndexRef = useRef<number>(HOME_NAV_INDEX_MAP[commonState.navActiveId] ?? 0)

  const handleNavUpdate = useCallback((nextId: NavId) => {
    const nextIndex = HOME_NAV_INDEX_MAP[nextId] ?? 0
    const nextDir: 1 | -1 = nextIndex >= prevIndexRef.current ? 1 : -1
    prevIndexRef.current = nextIndex
    animateHomePillToIndex(nextIndex)
    setDirection(nextDir)
    setMountedMap((prev) => (prev[nextId] ? prev : { ...prev, [nextId]: true }))
    setActiveId(nextId)
  }, [])

  useEffect(() => {
    global.lx.homePagerIdle = true
    animateHomePillToIndex(HOME_NAV_INDEX_MAP[commonState.navActiveId] ?? 0)
    global.state_event.on('navActiveIdUpdated', handleNavUpdate)
    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavUpdate)
    }
  }, [handleNavUpdate])

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      {HOME_NAV_IDS.map((id) => (
        <HorizontalSlot
          key={id}
          id={id}
          mounted={Boolean(mountedMap[id])}
          active={activeId === id}
          direction={direction}
        />
      ))}
    </View>
  )
}

export default Main


