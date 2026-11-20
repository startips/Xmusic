import { memo, useState, useRef, useMemo, useEffect } from 'react'
import { View, AppState, Animated, Pressable } from 'react-native'

import Header from './components/Header'
import Player from './Player'
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import Pic from './Pic'
import Lyric from './Lyric'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { M3Motion, M3Radius, withAlpha } from '@/theme/m3'

const LyricPage = ({ activeIndex }: { activeIndex: number }) => {
  const initedRef = useRef(false)
  const lyric = useMemo(() => <Lyric />, [])
  switch (activeIndex) {
    // case 3:
    case 1:
      if (!initedRef.current) initedRef.current = true
      return lyric
    default:
      return initedRef.current ? lyric : null
  }
  // return activeIndex == 0 || activeIndex == 1 ? setting : null
}

const PageIndicator = ({
  pageIndex,
  onSelectPage,
}: {
  pageIndex: number
  onSelectPage: (index: number) => void
}) => {
  const theme = useTheme()
  const anim = useRef(new Animated.Value(pageIndex)).current

  useEffect(() => {
    Animated.spring(anim, {
      toValue: pageIndex,
      ...M3Motion.spatialFast,
    }).start()
  }, [pageIndex, anim])

  const dot0ScaleX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2.6, 1],
    extrapolate: 'clamp',
  })
  const dot1ScaleX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.6],
    extrapolate: 'clamp',
  })

  return (
    <View style={styles.pageIndicator}>
      <Pressable hitSlop={10} onPress={() => { onSelectPage(0) }} style={styles.pageIndicatorBtn}>
        <Animated.View
          style={{
            ...styles.pageIndicatorDot,
            backgroundColor: pageIndex == 0 ? theme['m3-primary'] : withAlpha(theme['m3-on-surface-variant'], 0.35),
            transform: [{ scaleX: dot0ScaleX }],
          }}
        />
      </Pressable>
      <Pressable hitSlop={10} onPress={() => { onSelectPage(1) }} style={styles.pageIndicatorBtn}>
        <Animated.View
          style={{
            ...styles.pageIndicatorDot,
            backgroundColor: pageIndex == 1 ? theme['m3-primary'] : withAlpha(theme['m3-on-surface-variant'], 0.35),
            transform: [{ scaleX: dot1ScaleX }],
          }}
        />
      </Pressable>
    </View>
  )
}

export default memo(({ componentId }: { componentId: string }) => {
  const [pageIndex, setPageIndex] = useState(0)
  const pagerViewRef = useRef<PagerView>(null)
  const showLyricRef = useRef(false)

  const onPageSelected = ({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    setPageIndex(nativeEvent.position)
    showLyricRef.current = nativeEvent.position == 1
    if (showLyricRef.current) {
      screenkeepAwake()
    } else {
      screenUnkeepAwake()
    }
  }

  const handleSelectPage = (index: number) => {
    pagerViewRef.current?.setPage(index)
  }

  useEffect(() => {
    let appstateListener = AppState.addEventListener('change', (state) => {
      switch (state) {
        case 'active':
          if (showLyricRef.current && !commonState.componentIds.comment) screenkeepAwake()
          break
        case 'background':
          screenUnkeepAwake()
          break
      }
    })

    const handleComponentIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState == 'active') screenkeepAwake()
    }

    global.state_event.on('componentIdsUpdated', handleComponentIdsChange)

    return () => {
      global.state_event.off('componentIdsUpdated', handleComponentIdsChange)
      appstateListener.remove()
      screenUnkeepAwake()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <View style={styles.container}>
        <PagerView
          ref={pagerViewRef}
          onPageSelected={onPageSelected}
          style={styles.pagerView}
        >
          <View collapsable={false}>
            <Pic componentId={componentId} />
          </View>
          <View collapsable={false}>
            <LyricPage activeIndex={pageIndex} />
          </View>
        </PagerView>
        <PageIndicator pageIndex={pageIndex} onSelectPage={handleSelectPage} />
        <Player />
      </View>
      <Header />
    </>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  pagerView: {
    flex: 1,
  },
  pageIndicator: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
    paddingBottom: 4,
  },
  pageIndicatorBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicatorDot: {
    width: 7,
    height: 5,
    borderRadius: M3Radius.full,
  },
})
