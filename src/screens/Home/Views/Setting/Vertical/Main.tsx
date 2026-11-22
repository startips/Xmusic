import { memo, useCallback, useEffect, useRef, useState, type ComponentRef } from 'react'
import { ScrollView, View } from 'react-native'
import PagerView, {
  type PagerViewOnPageScrollEvent,
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view'

import NavList from './NavList'
import {
  SETTING_SCREENS,
  SettingGroupContent,
  normalizeSettingScreenId,
  type SettingScreenIds,
} from '../Main'
import { registerSettingPagerLock } from '../pagerLock'
import { hapticTick } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

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

export default () => {
  const initialId = normalizeSettingScreenId(global.lx.settingActiveId)
  const initialIndex = Math.max(0, SETTING_SCREENS.indexOf(initialId))

  const pagerViewRef = useRef<ComponentRef<typeof PagerView>>(null)
  const activeIndexRef = useRef<number>(initialIndex)
  const [activeId, setActiveId] = useState<SettingScreenIds>(initialId)
  const [mountedMap, setMountedMap] = useState<Partial<Record<SettingScreenIds, boolean>>>(() => ({
    [initialId]: true,
  }))

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

  // Pre-warm immediate neighbor pages right after the SettingScreen push transition settles
  useEffect(() => {
    const timer = setTimeout(() => {
      const idx = activeIndexRef.current
      const neighbors: SettingScreenIds[] = []
      if (idx > 0) neighbors.push(SETTING_SCREENS[idx - 1])
      if (idx + 1 < SETTING_SCREENS.length) neighbors.push(SETTING_SCREENS[idx + 1])
      if (neighbors.length) ensureMounted(neighbors)
    }, 260)
    return () => {
      clearTimeout(timer)
    }
  }, [activeId, ensureMounted])

  const handleSelectFromNav = useCallback((nextId: SettingScreenIds) => {
    const nextIndex = SETTING_SCREENS.indexOf(nextId)
    if (nextIndex < 0) return
    ensureMounted([nextId])
    if (activeIndexRef.current !== nextIndex) {
      hapticTick()
      activeIndexRef.current = nextIndex
      setActiveId(nextId)
      global.lx.settingActiveId = nextId
      pagerViewRef.current?.setPage(nextIndex)
    }
  }, [ensureMounted])

  const handlePageScroll = useCallback(({ nativeEvent }: PagerViewOnPageScrollEvent) => {
    const { position, offset } = nativeEvent
    if (offset <= 0.01) return
    const candidates: SettingScreenIds[] = []
    const current = SETTING_SCREENS[position]
    const next = SETTING_SCREENS[position + 1]
    if (current) candidates.push(current)
    if (next) candidates.push(next)
    if (candidates.length) ensureMounted(candidates)
  }, [ensureMounted])

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

  return (
    <View style={styles.container}>
      <NavList activeId={activeId} onChangeId={handleSelectFromNav} />
      <PagerView
        ref={pagerViewRef}
        initialPage={initialIndex}
        offscreenPageLimit={2}
        onPageScroll={handlePageScroll}
        onPageSelected={handlePageSelected}
        style={styles.pager}
      >
        {SETTING_SCREENS.map((id) => (
          <View key={id} collapsable={false} style={styles.page}>
            <SettingPage id={id} mounted={Boolean(mountedMap[id])} />
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
