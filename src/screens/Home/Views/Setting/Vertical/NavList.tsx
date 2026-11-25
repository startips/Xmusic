import { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { useHasNewVersion } from '@/store/version/hook'
import { createStyle } from '@/utils/tools'
import { scaleSizeW } from '@/utils/pixelRatio'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { M3Motion, M3Radius } from '@/theme/m3'

export interface NavListRef {
  scrollToId: (id: SettingScreenIds, animated: boolean) => void
  syncScrollProgress: (progress: number) => void
}

interface ItemRect {
  x: number
  y: number
  width: number
  height: number
}

interface NavListProps {
  activeId: SettingScreenIds
  pillProgress: Animated.Value
  pillStretch: Animated.Value
  onChangeId: (id: SettingScreenIds) => void
}

const CENTER_BASE_WIDTH = 100
const STRETCH_HALF_PX = scaleSizeW(5)

const SlidingCapsule = memo(({
  rects,
  pillProgress,
  pillStretch,
  color,
}: {
  rects: ItemRect[]
  pillProgress: Animated.Value
  pillStretch: Animated.Value
  color: string
}) => {
  const pillHeight = rects[0].height
  const pillTop = rects[0].y
  const pillRadius = pillHeight / 2

  const {
    leftCapTx,
    rightCapTx,
    centerTx,
    centerScaleX,
    pillScaleY,
  } = useMemo(() => {
    const inputRange = rects.map((_, idx) => idx)
    const baseLeft = pillProgress.interpolate({
      inputRange,
      outputRange: rects.map(r => r.x),
      extrapolate: 'clamp',
    })
    const baseRightCap = pillProgress.interpolate({
      inputRange,
      outputRange: rects.map(r => r.x + Math.max(r.width, pillHeight) - pillHeight),
      extrapolate: 'clamp',
    })
    const stretchHalf = pillStretch.interpolate({
      inputRange: [0, 1],
      outputRange: [0, STRETCH_HALF_PX],
      extrapolate: 'clamp',
    })
    const leftCapTx = Animated.subtract(baseLeft, stretchHalf)
    const rightCapTx = Animated.add(baseRightCap, stretchHalf)
    const centerTx = pillProgress.interpolate({
      inputRange,
      outputRange: rects.map(r => r.x + Math.max(r.width, pillHeight) / 2 - CENTER_BASE_WIDTH / 2),
      extrapolate: 'clamp',
    })
    const baseCenterScaleX = pillProgress.interpolate({
      inputRange,
      outputRange: rects.map(r => Math.max(0.01, (Math.max(r.width, pillHeight) - pillHeight + 1) / CENTER_BASE_WIDTH)),
      extrapolate: 'clamp',
    })
    const stretchCenterScaleX = pillStretch.interpolate({
      inputRange: [0, 1],
      outputRange: [0, (STRETCH_HALF_PX * 2) / CENTER_BASE_WIDTH],
      extrapolate: 'clamp',
    })
    const centerScaleX = Animated.add(baseCenterScaleX, stretchCenterScaleX)
    const pillScaleY = pillStretch.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.89],
      extrapolate: 'clamp',
    })
    return {
      leftCapTx,
      rightCapTx,
      centerTx,
      centerScaleX,
      pillScaleY,
    }
  }, [pillHeight, pillProgress, pillStretch, rects])

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: pillTop,
        left: 0,
        right: 0,
        height: pillHeight,
        transform: [{ scaleY: pillScaleY }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: pillHeight,
          height: pillHeight,
          borderRadius: pillRadius,
          backgroundColor: color,
          transform: [{ translateX: leftCapTx }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: CENTER_BASE_WIDTH,
          height: pillHeight,
          backgroundColor: color,
          transform: [{ translateX: centerTx }, { scaleX: centerScaleX }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: pillHeight,
          height: pillHeight,
          borderRadius: pillRadius,
          backgroundColor: color,
          transform: [{ translateX: rightCapTx }],
        }}
      />
    </Animated.View>
  )
})

const ListItem = memo(({
  id,
  index,
  useFallbackBg,
  showBadge,
  pillProgress,
  onPress,
  onItemLayout,
}: {
  id: SettingScreenIds
  index: number
  useFallbackBg: boolean
  showBadge: boolean
  pillProgress: Animated.Value
  onPress: (item: SettingScreenIds) => void
  onItemLayout: (id: SettingScreenIds, rect: ItemRect) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const pressScale = useRef(new Animated.Value(1)).current
  const badgeColor = theme.isDark ? '#FF453A' : '#E53935'
  const label = t(`setting_group_${id}`)

  const activeOpacity = useMemo(() => pillProgress.interpolate({
    inputRange: [index - 0.6, index, index + 0.6],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  }), [index, pillProgress])

  const inactiveOpacity = useMemo(() => pillProgress.interpolate({
    inputRange: [index - 0.6, index, index + 0.6],
    outputRange: [1, 0, 1],
    extrapolate: 'clamp',
  }), [index, pillProgress])

  const handlePress = () => {
    onPress(id)
  }

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    onItemLayout(id, {
      x: nativeEvent.layout.x,
      y: nativeEvent.layout.y,
      width: nativeEvent.layout.width,
      height: nativeEvent.layout.height,
    })
  }

  return (
    <View onLayout={handleLayout}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => { M3Motion.pressSpring(pressScale, 0.93).start() }}
        onPressOut={() => {
          Animated.spring(pressScale, {
            toValue: 1,
            ...M3Motion.expressiveBounce,
          }).start()
        }}
      >
        <Animated.View
          style={[
            styles.listItem,
            useFallbackBg
              ? { backgroundColor: theme['m3-secondary-container'], borderRadius: M3Radius.full }
              : null,
            { transform: [{ scale: pressScale }] },
          ]}
        >
          <View style={styles.labelWrap}>
            <Animated.View style={{ opacity: activeOpacity }}>
              <Text
                size={13}
                numberOfLines={1}
                style={styles.listTextActive}
                color={theme['m3-on-secondary-container']}
              >
                {label}
              </Text>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.labelOverlay, { opacity: inactiveOpacity }]}
            >
              <Text
                size={13}
                numberOfLines={1}
                style={styles.listText}
                color={theme['m3-on-surface-variant']}
              >
                {label}
              </Text>
            </Animated.View>
          </View>
          {showBadge
            ? <View style={{ ...styles.badgeDot, backgroundColor: badgeColor }} />
            : null}
        </Animated.View>
      </Pressable>
    </View>
  )
})

export default memo(forwardRef<NavListRef, NavListProps>(({
  activeId,
  pillProgress,
  pillStretch,
  onChangeId,
}, ref) => {
  const theme = useTheme()
  const hasNewVersion = useHasNewVersion()
  const scrollViewRef = useRef<ScrollView>(null)
  const itemRectsRef = useRef<Partial<Record<SettingScreenIds, ItemRect>>>({})
  const measuredRectsRef = useRef<ItemRect[] | null>(null)
  const trackXRef = useRef(0)
  const scrollWidthRef = useRef(0)
  const contentWidthRef = useRef(0)
  const didInitialScrollRef = useRef(false)
  const lastScrollTargetXRef = useRef(-1)
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const [measuredRects, setMeasuredRects] = useState<ItemRect[] | null>(null)

  const scrollToId = useCallback((targetId: SettingScreenIds, animated: boolean) => {
    const rect = itemRectsRef.current[targetId]
    const scrollW = scrollWidthRef.current
    const contentW = contentWidthRef.current
    if (!rect || scrollW <= 0 || contentW <= scrollW) return
    const maxOffset = Math.max(0, contentW - scrollW)
    const desired = trackXRef.current + rect.x + rect.width / 2 - scrollW / 2
    const targetX = Math.max(0, Math.min(maxOffset, desired))
    lastScrollTargetXRef.current = targetX
    scrollViewRef.current?.scrollTo({ x: targetX, animated })
  }, [])

  const syncScrollProgress = useCallback((progress: number) => {
    const scrollW = scrollWidthRef.current
    const contentW = contentWidthRef.current
    if (scrollW <= 0 || contentW <= scrollW) return
    const maxIndex = SETTING_SCREENS.length - 1
    const clamped = Math.max(0, Math.min(maxIndex, progress))
    const lowerIdx = Math.floor(clamped)
    const upperIdx = Math.min(maxIndex, lowerIdx + 1)
    const frac = clamped - lowerIdx
    const lowerRect = itemRectsRef.current[SETTING_SCREENS[lowerIdx]]
    const upperRect = itemRectsRef.current[SETTING_SCREENS[upperIdx]]
    if (!lowerRect || !upperRect) return
    const lowerCenter = trackXRef.current + lowerRect.x + lowerRect.width / 2
    const upperCenter = trackXRef.current + upperRect.x + upperRect.width / 2
    const centerX = lowerCenter + (upperCenter - lowerCenter) * frac
    const maxOffset = Math.max(0, contentW - scrollW)
    const targetX = Math.max(0, Math.min(maxOffset, centerX - scrollW / 2))
    if (lastScrollTargetXRef.current >= 0 && Math.abs(targetX - lastScrollTargetXRef.current) < 0.75) {
      return
    }
    lastScrollTargetXRef.current = targetX
    scrollViewRef.current?.scrollTo({ x: targetX, animated: false })
  }, [])

  useImperativeHandle(ref, () => ({
    scrollToId,
    syncScrollProgress,
  }), [scrollToId, syncScrollProgress])

  const tryInitialScroll = useCallback(() => {
    const currentId = activeIdRef.current
    if (
      !didInitialScrollRef.current &&
      itemRectsRef.current[currentId] &&
      scrollWidthRef.current > 0 &&
      contentWidthRef.current > 0
    ) {
      didInitialScrollRef.current = true
      scrollToId(currentId, false)
    }
  }, [scrollToId])

  const handleItemLayout = useCallback((id: SettingScreenIds, rect: ItemRect) => {
    if (rect.width <= 0 || rect.height <= 0) return
    itemRectsRef.current[id] = rect

    const allMeasured = SETTING_SCREENS.every(screenId => {
      const r = itemRectsRef.current[screenId]
      return r != null && r.width > 0 && r.height > 0
    })
    if (allMeasured) {
      const prev = measuredRectsRef.current
      const changed = !prev || SETTING_SCREENS.some((screenId, idx) => {
        const nextRect = itemRectsRef.current[screenId]!
        const prevRect = prev[idx]
        return (
          !prevRect ||
          Math.abs(nextRect.x - prevRect.x) > 0.5 ||
          Math.abs(nextRect.y - prevRect.y) > 0.5 ||
          Math.abs(nextRect.width - prevRect.width) > 0.5 ||
          Math.abs(nextRect.height - prevRect.height) > 0.5
        )
      })
      if (changed) {
        const nextRects = SETTING_SCREENS.map(screenId => itemRectsRef.current[screenId]!)
        measuredRectsRef.current = nextRects
        setMeasuredRects(nextRects)
      }
    }

    tryInitialScroll()
  }, [tryInitialScroll])

  const handleTrackLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    trackXRef.current = nativeEvent.layout.x
    tryInitialScroll()
  }, [tryInitialScroll])

  const handleScrollLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    scrollWidthRef.current = nativeEvent.layout.width
    tryInitialScroll()
  }, [tryInitialScroll])

  const handleContentSizeChange = useCallback((width: number) => {
    contentWidthRef.current = width
    tryInitialScroll()
  }, [tryInitialScroll])

  const handleScrollBeginDrag = useCallback(() => {
    lastScrollTargetXRef.current = -1
  }, [])

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      onLayout={handleScrollLayout}
      onContentSizeChange={handleContentSizeChange}
      onScrollBeginDrag={handleScrollBeginDrag}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps={'always'}
      showsHorizontalScrollIndicator={false}
    >
      <View
        onLayout={handleTrackLayout}
        style={[styles.track, { backgroundColor: theme['m3-surface-container'] }]}
      >
        {measuredRects
          ? (
              <SlidingCapsule
                rects={measuredRects}
                pillProgress={pillProgress}
                pillStretch={pillStretch}
                color={theme['m3-secondary-container']}
              />
            )
          : null}
        {SETTING_SCREENS.map((id, index) => (
          <ListItem
            key={id}
            id={id}
            index={index}
            useFallbackBg={measuredRects == null && activeId === id}
            showBadge={id === 'about' && hasNewVersion}
            pillProgress={pillProgress}
            onPress={onChangeId}
            onItemLayout={handleItemLayout}
          />
        ))}
      </View>
    </ScrollView>
  )
}))

const styles = createStyle({
  container: {
    minHeight: 46,
    flexGrow: 0,
    flexShrink: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 6,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    padding: 3,
    borderRadius: M3Radius.full,
    overflow: 'hidden',
  },
  listItem: {
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  labelWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listText: {
    fontWeight: '500',
  },
  listTextActive: {
    fontWeight: '700',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: M3Radius.full,
  },
})
