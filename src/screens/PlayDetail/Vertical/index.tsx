import { memo, useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { View, AppState, Animated, Pressable } from 'react-native'

import Header from './components/Header'
import Player from './Player'
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import Pic from './Pic'
import Lyric from './Lyric'
import LyricShareModal, { type LyricShareModalType } from '../components/LyricShareModal'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import AudioSpectrum from '@/components/common/AudioSpectrum'
import LinearGradientOverlay from '@/components/common/LinearGradientOverlay'
import { M3Motion, M3Radius, withAlpha } from '@/theme/m3'

const LyricPage = ({ activeIndex, onLongPressLyric }: { activeIndex: number, onLongPressLyric: (lineIndex: number) => void }) => {
  const initedRef = useRef(false)
  const lyric = useMemo(() => <Lyric onLongPressLyric={onLongPressLyric} />, [onLongPressLyric])
  switch (activeIndex) {
    case 1:
      if (!initedRef.current) initedRef.current = true
      return lyric
    default:
      return initedRef.current ? lyric : null
  }
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

export default memo(({ componentId, onBack }: { componentId: string, onBack: () => void }) => {
  const [pageIndex, setPageIndex] = useState(0)
  const pagerViewRef = useRef<PagerView>(null)
  const lyricShareRef = useRef<LyricShareModalType>(null)
  const showLyricRef = useRef(false)

  const handleLongPressLyric = useCallback((lineIndex: number) => {
    lyricShareRef.current?.show(lineIndex)
  }, [])
  const theme = useTheme()
  const visualizerMode = useSettingValue('playDetail.visualizerMode')

  const topScrimColors = useMemo(() => {
    const base = theme['m3-background']
    return [withAlpha(base, 0.88), withAlpha(base, 0.56), withAlpha(base, 0.2), withAlpha(base, 0)]
  }, [theme])

  const bottomScrimColors = useMemo(() => {
    const base = theme['m3-background']
    return [withAlpha(base, 0), withAlpha(base, 0.24), withAlpha(base, 0.64), withAlpha(base, 0.9)]
  }, [theme])

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
      else if (AppState.currentState == 'active' && showLyricRef.current) screenkeepAwake()
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
      <LinearGradientOverlay
        pointerEvents="none"
        colors={topScrimColors}
        locations={[0, 0.44, 0.76, 1]}
        style={styles.topScrim}
      />
      <LinearGradientOverlay
        pointerEvents="none"
        colors={bottomScrimColors}
        locations={[0, 0.30, 0.66, 1]}
        style={styles.bottomScrim}
      />
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
            <LyricPage activeIndex={pageIndex} onLongPressLyric={handleLongPressLyric} />
          </View>
        </PagerView>
        {visualizerMode === 'bars' || visualizerMode === 'ribbon'
          ? (
              <AudioSpectrum
                mode={visualizerMode}
                intensity={pageIndex === 1 ? 0.34 : 1}
                style={styles.spectrumBar}
              />
            )
          : null}
        <PageIndicator pageIndex={pageIndex} onSelectPage={handleSelectPage} />
        <Player />
      </View>
      <Header onBack={onBack} />
      <LyricShareModal ref={lyricShareRef} />
    </>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '32%',
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  pagerView: {
    flex: 1,
  },
  spectrumBar: {
    width: '100%',
    height: 44,
    marginTop: -6,
    marginBottom: 2,
  },
  pageIndicator: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    paddingBottom: 6,
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
