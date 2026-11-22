import { memo, useCallback, useEffect, useRef } from 'react'
import { TouchableOpacity, ScrollView, View, type LayoutChangeEvent } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { useHasNewVersion } from '@/store/version/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { M3Radius } from '@/theme/m3'

interface ItemRect {
  x: number
  width: number
}

const ListItem = memo(({ id, activeId, showBadge, onPress, onItemLayout }: {
  onPress: (item: SettingScreenIds) => void
  onItemLayout: (id: SettingScreenIds, rect: ItemRect) => void
  activeId: SettingScreenIds
  id: SettingScreenIds
  showBadge: boolean
}) => {
  const theme = useTheme()
  const t = useI18n()

  const active = activeId == id
  const badgeColor = theme.isDark ? '#FF453A' : '#E53935'

  const handlePress = () => {
    onPress(id)
  }

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    onItemLayout(id, {
      x: nativeEvent.layout.x,
      width: nativeEvent.layout.width,
    })
  }

  return (
    <View onLayout={handleLayout}>
      <TouchableOpacity
        style={{
          ...styles.listItem,
          backgroundColor: active ? theme['m3-secondary-container'] : theme['m3-surface-container'],
          borderColor: active ? 'transparent' : theme['m3-outline-variant'],
          borderWidth: active ? 0 : 0.6,
        }}
        activeOpacity={0.75}
        onPress={handlePress}
      >
        <Text
          size={13}
          numberOfLines={1}
          style={active ? styles.listTextActive : styles.listText}
          color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
        >
          {t(`setting_group_${id}`)}
        </Text>
        {showBadge
          ? <View style={{ ...styles.badgeDot, backgroundColor: badgeColor }} />
          : null}
      </TouchableOpacity>
    </View>
  )
}, (prevProps, nextProps) => {
  const prevActive = prevProps.activeId == prevProps.id
  const nextActive = nextProps.activeId == nextProps.id
  return (
    prevProps.id === nextProps.id &&
    prevActive === nextActive &&
    prevProps.showBadge === nextProps.showBadge
  )
})

export default memo(({ activeId, onChangeId }: {
  activeId: SettingScreenIds
  onChangeId: (id: SettingScreenIds) => void
}) => {
  const hasNewVersion = useHasNewVersion()
  const scrollViewRef = useRef<ScrollView>(null)
  const itemRectsRef = useRef<Partial<Record<SettingScreenIds, ItemRect>>>({})
  const scrollWidthRef = useRef(0)
  const contentWidthRef = useRef(0)
  const didInitialScrollRef = useRef(false)

  const scrollToActive = useCallback((targetId: SettingScreenIds, animated: boolean) => {
    const rect = itemRectsRef.current[targetId]
    const scrollW = scrollWidthRef.current
    const contentW = contentWidthRef.current
    if (!rect || scrollW <= 0 || contentW <= scrollW) return
    const maxOffset = Math.max(0, contentW - scrollW)
    const desired = rect.x + rect.width / 2 - scrollW / 2
    const targetX = Math.max(0, Math.min(maxOffset, desired))
    scrollViewRef.current?.scrollTo({ x: targetX, animated })
  }, [])

  useEffect(() => {
    scrollToActive(activeId, true)
  }, [activeId, scrollToActive])

  const handleItemLayout = useCallback((id: SettingScreenIds, rect: ItemRect) => {
    itemRectsRef.current[id] = rect
    if (id === activeId && !didInitialScrollRef.current && scrollWidthRef.current > 0 && contentWidthRef.current > 0) {
      didInitialScrollRef.current = true
      scrollToActive(activeId, false)
    }
  }, [activeId, scrollToActive])

  const handleScrollLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    scrollWidthRef.current = nativeEvent.layout.width
    if (!didInitialScrollRef.current && itemRectsRef.current[activeId] && contentWidthRef.current > 0) {
      didInitialScrollRef.current = true
      scrollToActive(activeId, false)
    }
  }, [activeId, scrollToActive])

  const handleContentSizeChange = useCallback((width: number) => {
    contentWidthRef.current = width
    if (!didInitialScrollRef.current && itemRectsRef.current[activeId] && scrollWidthRef.current > 0) {
      didInitialScrollRef.current = true
      scrollToActive(activeId, false)
    }
  }, [activeId, scrollToActive])

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      onLayout={handleScrollLayout}
      onContentSizeChange={handleContentSizeChange}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps={'always'}
      showsHorizontalScrollIndicator={false}
    >
      {
        SETTING_SCREENS.map(id => (
          <ListItem
            key={id}
            id={id}
            activeId={activeId}
            showBadge={id === 'about' && hasNewVersion}
            onPress={onChangeId}
            onItemLayout={handleItemLayout}
          />
        ))
      }
    </ScrollView>
  )
})

const styles = createStyle({
  container: {
    height: 46,
    flexGrow: 0,
    flexShrink: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 8,
  },
  listItem: {
    height: 34,
    paddingHorizontal: 15,
    borderRadius: M3Radius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: 5,
  },
})
