import { memo, useMemo, useEffect, useRef, useCallback, useState } from 'react'
import {
  Animated,
  FlatList,
  Pressable,
  View,
  type FlatListProps,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { type Line, useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useStatusbarHeight } from '@/store/common/hook'
import { useSettingValue } from '@/store/setting/hook'
import { AnimatedColorText } from '@/components/common/Text'
import { setSpText } from '@/utils/pixelRatio'
import playerState from '@/store/player/state'
import { scrollTo } from '@/utils/scroll'
import PlayLine, { type PlayLineType } from '../components/PlayLine'
import KaraokeLineText from '../components/KaraokeLineText'
import { HEADER_HEIGHT } from './components/Header'
import { M3Motion, M3Radius, withAlpha } from '@/theme/m3'
import { lookupKaraokeTokens, useKaraokeLyricMap, type KaraokeToken } from '@/utils/karaokeLyric'
import { hapticHeavy, hapticTick } from '@/utils/haptics'

type FlatListType = FlatListProps<Line>
type DistanceTier = 0 | 1 | 2 | 3

const getDistanceTier = (lineNum: number, activeLine: number): DistanceTier => {
  if (activeLine < 0) return 1
  if (lineNum === activeLine) return 0
  const d = Math.abs(lineNum - activeLine)
  if (d === 1) return 1
  if (d === 2) return 2
  return 3
}

const DOF_OPACITIES: Record<DistanceTier, number> = {
  0: 1,
  1: 0.74,
  2: 0.56,
  3: 0.4,
}

interface LineProps {
  line: Line
  lineNum: number
  distanceTier: DistanceTier
  tokens: KaraokeToken[] | null
  isShowKaraoke: boolean
  onLayout: (lineNum: number, height: number, width: number) => void
  onPressLine: (line: Line) => void
  onLongPressLine?: (lineNum: number) => void
}

const LrcLine = memo(({
  line,
  lineNum,
  distanceTier,
  tokens,
  isShowKaraoke,
  onLayout,
  onPressLine,
  onLongPressLine,
}: LineProps) => {
  const theme = useTheme()
  const lrcFontSize = useSettingValue('playDetail.vertical.style.lrcFontSize')
  const textAlign = useSettingValue('playDetail.style.align')
  const size = lrcFontSize / 10
  const lineHeight = setSpText(size) * 1.32
  const isActive = distanceTier === 0
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const scaleAnim = useRef(new Animated.Value(isActive && isShowKaraoke ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive && isShowKaraoke ? 1 : 0,
      ...M3Motion.spatialFast,
      useNativeDriver: true,
    }).start()
  }, [isActive, isShowKaraoke, scaleAnim])

  const colors = useMemo(() => {
    if (isActive) {
      return [
        theme['m3-primary'],
        withAlpha(theme['m3-primary'], 0.86),
        1,
      ] as const
    }
    const opacity = isShowKaraoke ? DOF_OPACITIES[distanceTier] : 0.68
    return [
      theme['m3-on-surface-variant'],
      theme['m3-on-surface-variant'],
      opacity,
    ] as const
  }, [distanceTier, isActive, isShowKaraoke, theme])

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const { height, width } = nativeEvent.layout
    if (width > 0 && Math.abs(width - measuredWidth) > 1) {
      setMeasuredWidth(width)
    }
    onLayout(lineNum, height, width)
  }

  const scale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.032],
  })
  const anchorShift = textAlign === 'left'
    ? measuredWidth * 0.016
    : textAlign === 'right'
      ? -measuredWidth * 0.016
      : 0
  const translateX = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, anchorShift],
  })

  return (
    <Pressable
      onLayout={handleLayout}
      delayLongPress={360}
      android_ripple={{ color: withAlpha(theme['m3-primary'], 0.1), borderless: false }}
      onPress={() => { onPressLine(line) }}
      onLongPress={onLongPressLine ? () => { onLongPressLine(lineNum) } : undefined}
      style={styles.line}
    >
      <Animated.View style={{ transform: [{ translateX }, { scale }] }}>
        {isActive && isShowKaraoke && tokens && tokens.length > 0
          ? (
              <KaraokeLineText
                tokens={tokens}
                lineStartMs={line.time}
                size={size}
                style={{
                  ...styles.lineText,
                  textAlign,
                  lineHeight,
                }}
              />
            )
          : (
              <AnimatedColorText
                style={{
                  ...styles.lineText,
                  ...(isActive ? styles.activeLineWeight : null),
                  textAlign,
                  lineHeight,
                }}
                textBreakStrategy="simple"
                color={colors[0]}
                opacity={colors[2]}
                size={size}
              >
                {line.text}
              </AnimatedColorText>
            )}
        {line.extendedLyrics.map((lrc, index) => (
          <AnimatedColorText
            style={{
              ...styles.lineTranslationText,
              textAlign,
              lineHeight: lineHeight * 0.8,
            }}
            textBreakStrategy="simple"
            key={index}
            color={colors[1]}
            opacity={colors[2]}
            size={size * 0.8}
          >
            {lrc}
          </AnimatedColorText>
        ))}
      </Animated.View>
    </Pressable>
  )
}, (prev, next) => (
  prev.line === next.line &&
  prev.distanceTier === next.distanceTier &&
  prev.tokens === next.tokens &&
  prev.isShowKaraoke === next.isShowKaraoke &&
  prev.onLongPressLine === next.onLongPressLine
))

const wait = async() => new Promise(resolve => setTimeout(resolve, 100))

export default ({ onLongPressLyric }: { onLongPressLyric?: (lineIndex: number) => void }) => {
  const statusBarHeight = useStatusbarHeight()
  const lyricLines = useLrcSet()
  const { line } = useLrcPlay()
  const isShowKaraoke = useSettingValue('playDetail.isShowKaraokeLyric')
  const karaokeMap = useKaraokeLyricMap(isShowKaraoke)
  const flatListRef = useRef<FlatList>(null)
  const playLineRef = useRef<PlayLineType>(null)
  const isPauseScrollRef = useRef(true)
  const scrollTimoutRef = useRef<NodeJS.Timeout | null>(null)
  const delayScrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const lineRef = useRef({ line: 0, prevLine: 0 })
  const isFirstSetLrc = useRef(true)
  const scrollInfoRef = useRef<NativeSyntheticEvent<NativeScrollEvent>['nativeEvent'] | null>(null)
  const listLayoutInfoRef = useRef<{ spaceHeight: number, lineHeights: number[] }>({ spaceHeight: 0, lineHeights: [] })
  const scrollCancelRef = useRef<(() => void) | null>(null)
  const isShowLyricProgressSetting = useSettingValue('playDetail.isShowLyricProgressSetting')

  const handleScrollToActive = (index = lineRef.current.line) => {
    if (index < 0) return
    if (flatListRef.current) {
      let canCustomScroll = false
      let offset = listLayoutInfoRef.current.spaceHeight
      if (scrollInfoRef.current && lineRef.current.line - lineRef.current.prevLine == 1 && listLayoutInfoRef.current.lineHeights[index] != null) {
        canCustomScroll = true
        for (let i = 0; i < index; i++) {
          const h = listLayoutInfoRef.current.lineHeights[i]
          if (h == null) {
            canCustomScroll = false
            break
          }
          offset += h
        }
      }
      if (canCustomScroll && scrollInfoRef.current) {
        offset += (listLayoutInfoRef.current.lineHeights[index] ?? 0) / 2
        try {
          scrollCancelRef.current = scrollTo(flatListRef.current, scrollInfoRef.current, offset - scrollInfoRef.current.layoutMeasurement.height * 0.42, 600, () => {
            scrollCancelRef.current = null
          })
        } catch {}
      } else {
        if (scrollCancelRef.current) {
          scrollCancelRef.current()
          scrollCancelRef.current = null
        }
        try {
          flatListRef.current.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.42,
          })
        } catch {}
      }
    }
  }

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollInfoRef.current = nativeEvent
    if (isPauseScrollRef.current) {
      playLineRef.current?.updateScrollInfo(nativeEvent)
    }
  }
  const handleScrollBeginDrag = () => {
    isPauseScrollRef.current = true
    playLineRef.current?.setVisible(true)
    if (delayScrollTimeout.current) {
      clearTimeout(delayScrollTimeout.current)
      delayScrollTimeout.current = null
    }
    if (scrollTimoutRef.current) {
      clearTimeout(scrollTimoutRef.current)
      scrollTimoutRef.current = null
    }
    if (scrollCancelRef.current) {
      scrollCancelRef.current()
      scrollCancelRef.current = null
    }
  }

  const onScrollEndDrag = () => {
    if (!isPauseScrollRef.current) return
    if (scrollTimoutRef.current) clearTimeout(scrollTimoutRef.current)
    scrollTimoutRef.current = setTimeout(() => {
      playLineRef.current?.setVisible(false)
      scrollTimoutRef.current = null
      isPauseScrollRef.current = false
      if (!playerState.isPlay) return
      handleScrollToActive()
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (delayScrollTimeout.current) {
        clearTimeout(delayScrollTimeout.current)
        delayScrollTimeout.current = null
      }
      if (scrollTimoutRef.current) {
        clearTimeout(scrollTimoutRef.current)
        scrollTimoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    listLayoutInfoRef.current.lineHeights = []
    lineRef.current.prevLine = 0
    lineRef.current.line = 0
    if (!flatListRef.current) return
    flatListRef.current.scrollToOffset({
      offset: 0,
      animated: false,
    })
    if (!lyricLines.length) return
    playLineRef.current?.updateLyricLines(lyricLines)
    requestAnimationFrame(() => {
      if (isFirstSetLrc.current) {
        isFirstSetLrc.current = false
        setTimeout(() => {
          isPauseScrollRef.current = false
          handleScrollToActive()
        }, 100)
      } else {
        if (delayScrollTimeout.current) clearTimeout(delayScrollTimeout.current)
        delayScrollTimeout.current = setTimeout(() => {
          isPauseScrollRef.current = false
          playLineRef.current?.setVisible(false)
          handleScrollToActive(0)
        }, 100)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyricLines])

  useEffect(() => {
    if (line < 0) return
    lineRef.current.prevLine = lineRef.current.line
    lineRef.current.line = line
    if (!flatListRef.current || isPauseScrollRef.current) return

    if (line - lineRef.current.prevLine != 1) {
      handleScrollToActive()
      return
    }

    delayScrollTimeout.current = setTimeout(() => {
      delayScrollTimeout.current = null
      handleScrollToActive()
    }, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line])

  useEffect(() => {
    requestAnimationFrame(() => {
      playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
      playLineRef.current?.updateLyricLines(lyricLines)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShowLyricProgressSetting])

  const handleScrollToIndexFailed: FlatListType['onScrollToIndexFailed'] = (info) => {
    void wait().then(() => {
      handleScrollToActive(info.index)
    })
  }

  const handleLineLayout = useCallback<LineProps['onLayout']>((lineNum, height) => {
    listLayoutInfoRef.current.lineHeights[lineNum] = height
    playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
  }, [])

  const handleSpaceLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    listLayoutInfoRef.current.spaceHeight = nativeEvent.layout.height
    playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
  }, [])

  const handlePlayLine = useCallback((time: number) => {
    if (scrollTimoutRef.current) {
      clearTimeout(scrollTimoutRef.current)
      scrollTimoutRef.current = null
    }
    isPauseScrollRef.current = false
    playLineRef.current?.setVisible(false)
    global.app_event.setProgress(time)
  }, [])

  const handlePressLine = useCallback((targetLine: Line) => {
    if (targetLine.time < 0 || !targetLine.text.trim()) return
    hapticTick()
    handlePlayLine(targetLine.time / 1000)
  }, [handlePlayLine])

  const handleLongPressLine = useCallback((lineNum: number) => {
    if (!onLongPressLyric) return
    hapticHeavy()
    onLongPressLyric(lineNum)
  }, [onLongPressLyric])

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => {
    const tier = getDistanceTier(index, line)
    const tokens = tier === 0 ? lookupKaraokeTokens(karaokeMap, item.time) : null
    return (
      <LrcLine
        line={item}
        lineNum={index}
        distanceTier={tier}
        tokens={tokens}
        isShowKaraoke={isShowKaraoke}
        onLayout={handleLineLayout}
        onPressLine={handlePressLine}
        onLongPressLine={onLongPressLyric ? handleLongPressLine : undefined}
      />
    )
  }
  const getkey: FlatListType['keyExtractor'] = (item, index) => `${index}${item.text}`

  const spaceComponent = useMemo(() => (
    <View style={styles.space} onLayout={handleSpaceLayout}></View>
  ), [handleSpaceLayout])

  return (
    <View style={[styles.wrapper, { paddingTop: statusBarHeight + HEADER_HEIGHT }]}>
      <View style={styles.lyricBody}>
        <FlatList
          data={lyricLines}
          renderItem={renderItem}
          keyExtractor={getkey}
          style={styles.container}
          ref={flatListRef}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={spaceComponent}
          ListFooterComponent={spaceComponent}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onScrollEndDrag}
          fadingEdgeLength={100}
          initialNumToRender={Math.max(line + 10, 12)}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onScroll={handleScroll}
        />
        {isShowLyricProgressSetting ? <PlayLine ref={playLineRef} onPlayLine={handlePlayLine} /> : null}
      </View>
    </View>
  )
}

const styles = createStyle({
  wrapper: {
    flex: 1,
  },
  lyricBody: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 20,
  },
  space: {
    paddingTop: '100%',
  },
  line: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 4,
    borderRadius: M3Radius.sm,
  },
  lineText: {
    textAlign: 'center',
  },
  activeLineWeight: {
    fontWeight: '700',
  },
  lineTranslationText: {
    textAlign: 'center',
    paddingTop: 5,
  },
})
