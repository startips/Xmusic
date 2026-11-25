import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Animated, Easing, ScrollView, View } from 'react-native'
import PagerView, {
  type PageScrollStateChangedNativeEvent,
  type PagerViewOnPageScrollEvent,
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view'

import NavList, { type NavListRef } from './NavList'
import {
  SETTING_SCREENS,
  SettingGroupContent,
  normalizeSettingScreenId,
  type SettingScreenIds,
} from '../Main'
import { registerSettingPagerLock } from '../pagerLock'
import { hapticTick } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'
import { createSettingPagerMotion, type SettingPagerMotion } from './pagerMotion'

interface SettingPageSlotRef {
  runEnter: (direction: 1 | -1) => void
  resetEnter: () => void
}

const EMPHASIZED_DECEL = Easing.bezier(0.05, 0.7, 0.1, 1.0)
const FADE_IN_EASE = Easing.out(Easing.cubic)

const SettingPage = memo(({ id, mounted }: { id: SettingScreenIds, mounted: boolean }) => {
  if (!mounted) return null
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps={'always'}
    >
      <SettingGroupContent id={id} />
    </ScrollView>
  )
})

const SettingPageSlot = memo(forwardRef<SettingPageSlotRef, {
  index: number
  id: SettingScreenIds
  mounted: boolean
  swipeProgress: Animated.Value
}>(({ index, id, mounted, swipeProgress }, ref) => {
  const tapTranslateX = useRef(new Animated.Value(0)).current
  const tapScale = useRef(new Animated.Value(1)).current
  const tapOpacity = useRef(new Animated.Value(1)).current

  const swipeScale = useMemo(() => swipeProgress.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0.96, 1, 0.96],
    extrapolate: 'clamp',
  }), [index, swipeProgress])

  const swipeOpacity = useMemo(() => swipeProgress.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0.76, 1, 0.76],
    extrapolate: 'clamp',
  }), [index, swipeProgress])

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
      <SettingPage id={id} mounted={mounted} />
    </Animated.View>
  )
}))

export default () => {
  const initialId = normalizeSettingScreenId(global.lx.settingActiveId)
  const initialIndex = Math.max(0, SETTING_SCREENS.indexOf(initialId))

  const motionRef = useRef<SettingPagerMotion | null>(null)
  if (!motionRef.current) {
    motionRef.current = createSettingPagerMotion(initialIndex)
  }
  const motion = motionRef.current

  const pagerViewRef = useRef<ComponentRef<typeof PagerView>>(null)
  const navListRef = useRef<NavListRef>(null)
  const activeIndexRef = useRef<number>(initialIndex)
  const scrollStateRef = useRef<'idle' | 'dragging' | 'settling'>('idle')
  const slotRefs = useRef<Array<SettingPageSlotRef | null>>([])
  const isProgrammaticJumpRef = useRef(false)
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [activeId, setActiveId] = useState<SettingScreenIds>(initialId)
  const [mountedMap, setMountedMap] = useState<Partial<Record<SettingScreenIds, boolean>>>(() => ({
    [initialId]: true,
  }))
  const mountedMapRef = useRef<Partial<Record<SettingScreenIds, boolean>>>({ [initialId]: true })

  const ensureMounted = useCallback((ids: SettingScreenIds[]) => {
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
    registerSettingPagerLock((locked) => {
      pagerViewRef.current?.setScrollEnabled(!locked)
    })
    return () => {
      registerSettingPagerLock(null)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current) {
        clearTimeout(programmaticTimerRef.current)
        programmaticTimerRef.current = null
      }
      motion.stop()
    }
  }, [motion])

  // Pre-warm immediate neighbor pages right after the 300ms SettingScreen push transition settles
  useEffect(() => {
    const timer = setTimeout(() => {
      const idx = activeIndexRef.current
      const neighbors: SettingScreenIds[] = []
      if (idx > 0) neighbors.push(SETTING_SCREENS[idx - 1])
      if (idx + 1 < SETTING_SCREENS.length) neighbors.push(SETTING_SCREENS[idx + 1])
      if (neighbors.length) ensureMounted(neighbors)
    }, 360)
    return () => {
      clearTimeout(timer)
    }
  }, [activeId, ensureMounted])

  const handleSelectFromNav = useCallback((nextId: SettingScreenIds) => {
    const nextIndex = SETTING_SCREENS.indexOf(nextId)
    if (nextIndex < 0) return
    navListRef.current?.scrollToId(nextId, true)
    const wasMounted = Boolean(mountedMapRef.current[nextId])
    if (!wasMounted) ensureMounted([nextId])
    if (activeIndexRef.current === nextIndex) return

    const direction: 1 | -1 = nextIndex > activeIndexRef.current ? 1 : -1
    hapticTick()
    slotRefs.current[activeIndexRef.current]?.resetEnter()
    activeIndexRef.current = nextIndex
    setActiveId(nextId)
    global.lx.settingActiveId = nextId
    isProgrammaticJumpRef.current = true
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current)
    programmaticTimerRef.current = setTimeout(() => {
      programmaticTimerRef.current = null
      isProgrammaticJumpRef.current = false
    }, 80)
    motion.animateToIndex(nextIndex)
    if (wasMounted) {
      pagerViewRef.current?.setPageWithoutAnimation(nextIndex)
    } else {
      requestAnimationFrame(() => {
        pagerViewRef.current?.setPageWithoutAnimation(nextIndex)
      })
    }
    slotRefs.current[nextIndex]?.runEnter(direction)
  }, [ensureMounted, motion])

  const handlePageScroll = useCallback(({ nativeEvent }: PagerViewOnPageScrollEvent) => {
    const { position, offset } = nativeEvent
    if (offset > 0.01) {
      const candidates: SettingScreenIds[] = []
      const current = SETTING_SCREENS[position]
      const next = SETTING_SCREENS[position + 1]
      if (current) candidates.push(current)
      if (next) candidates.push(next)
      if (candidates.length) ensureMounted(candidates)
    }
    if (scrollStateRef.current !== 'idle' && !isProgrammaticJumpRef.current) {
      const progress = position + offset
      motion.syncGestureProgress(progress)
      navListRef.current?.syncScrollProgress(progress)
    }
  }, [ensureMounted, motion])

  const handlePageSelected = useCallback(({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    const nextIndex = nativeEvent.position
    const nextId = SETTING_SCREENS[nextIndex]
    if (!nextId) return
    ensureMounted([nextId])
    if (activeIndexRef.current !== nextIndex) {
      activeIndexRef.current = nextIndex
      setActiveId(nextId)
      global.lx.settingActiveId = nextId
      hapticTick()
    }
  }, [ensureMounted])

  const handlePageScrollStateChanged = useCallback(({ nativeEvent }: PageScrollStateChangedNativeEvent) => {
    const state = nativeEvent.pageScrollState
    scrollStateRef.current = state
    if (state === 'dragging') {
      isProgrammaticJumpRef.current = false
      if (programmaticTimerRef.current) {
        clearTimeout(programmaticTimerRef.current)
        programmaticTimerRef.current = null
      }
      motion.stop()
      slotRefs.current[activeIndexRef.current]?.resetEnter()
    } else if (state === 'idle' && !isProgrammaticJumpRef.current) {
      motion.syncGestureProgress(activeIndexRef.current)
      navListRef.current?.syncScrollProgress(activeIndexRef.current)
    }
  }, [motion])

  return (
    <View style={styles.container}>
      <NavList
        ref={navListRef}
        activeId={activeId}
        pillProgress={motion.pillProgress}
        pillStretch={motion.pillStretch}
        onChangeId={handleSelectFromNav}
      />
      <PagerView
        ref={pagerViewRef}
        initialPage={initialIndex}
        offscreenPageLimit={2}
        onPageScroll={handlePageScroll}
        onPageSelected={handlePageSelected}
        onPageScrollStateChanged={handlePageScrollStateChanged}
        style={styles.pager}
      >
        {SETTING_SCREENS.map((id, index) => (
          <View key={id} collapsable={false} style={styles.page}>
            <SettingPageSlot
              ref={(el) => { slotRefs.current[index] = el }}
              index={index}
              id={id}
              mounted={Boolean(mountedMap[id])}
              swipeProgress={motion.swipeProgress}
            />
          </View>
        ))}
      </PagerView>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
})
