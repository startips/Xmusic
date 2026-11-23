import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, View, type LayoutChangeEvent } from 'react-native'
import { BOTTOM_NAV_MENUS } from '@/config/constant'
import { setNavActiveId } from '@/core/common'
import { useI18n } from '@/lang'
import { useNavActiveId, useNavigationBarHeight } from '@/store/common/hook'
import type { InitState } from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useKeyboard } from '@/utils/hooks'
import { hapticTick } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { windowSizeTools } from '@/utils/windowSizeTools'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { M3Motion, M3Radius } from '@/theme/m3'
import { homePillProgress } from './pagerMotion'

type BottomNavId = typeof BOTTOM_NAV_MENUS[number]['id']

const PILL_WIDTH = scaleSizeW(58)
const PILL_HEIGHT = scaleSizeH(30)
const PILL_MARGIN_BOTTOM = scaleSizeH(3)
const CONTAINER_PAD_H = scaleSizeW(8)

const NavTab = memo(({
  id,
  index,
  icon,
  label,
  active,
  onPress,
}: {
  id: BottomNavId
  index: number
  icon: string
  label: string
  active: boolean
  onPress: (id: InitState['navActiveId']) => void
}) => {
  const theme = useTheme()
  const pressScale = useRef(new Animated.Value(1)).current

  const iconTranslateY = useMemo(() => homePillProgress.interpolate({
    inputRange: [index - 0.6, index, index + 0.6],
    outputRange: [1.5, 0, 1.5],
    extrapolate: 'clamp',
  }), [index])

  return (
    <Pressable
      style={styles.tab}
      onPress={() => { onPress(id) }}
      onPressIn={() => { M3Motion.pressSpring(pressScale, 0.91).start() }}
      onPressOut={() => {
        Animated.spring(pressScale, {
          toValue: 1,
          ...M3Motion.expressiveBounce,
        }).start()
      }}
    >
      <Animated.View style={{ ...styles.tabInner, transform: [{ scale: pressScale }] }}>
        <View
          style={{
            ...styles.pillWrap,
            width: PILL_WIDTH,
            height: PILL_HEIGHT,
            marginBottom: PILL_MARGIN_BOTTOM,
          }}
        >
          <Animated.View style={{ transform: [{ translateY: iconTranslateY }] }}>
            <Icon
              name={icon}
              size={19}
              color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
            />
          </Animated.View>
        </View>
        <Text
          size={11}
          numberOfLines={1}
          color={active ? theme['m3-on-surface'] : theme['m3-on-surface-variant']}
          style={active ? styles.labelActive : styles.label}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
})

export default memo(() => {
  const activeId = useNavActiveId()
  const navBarHeight = useNavigationBarHeight()
  const theme = useTheme()
  const t = useI18n()
  const { keyboardShown } = useKeyboard()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const [rowWidth, setRowWidth] = useState(() =>
    Math.max(windowSizeTools.getSize().width - CONTAINER_PAD_H * 2, 240),
  )

  const handleRowLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const nextWidth = nativeEvent.layout.width
    if (nextWidth > 0 && Math.abs(nextWidth - rowWidth) > 0.5) {
      setRowWidth(nextWidth)
    }
  }, [rowWidth])

  const slotWidth = rowWidth / BOTTOM_NAV_MENUS.length

  const pillTranslateX = useMemo(() => homePillProgress.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 1, 2, 3].map(i => (i + 0.5) * slotWidth - PILL_WIDTH / 2),
    extrapolate: 'clamp',
  }), [slotWidth])

  const pillScaleX = useMemo(() => homePillProgress.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    outputRange: [1, 1.22, 1, 1.22, 1, 1.22, 1],
    extrapolate: 'clamp',
  }), [])

  const pillScaleY = useMemo(() => homePillProgress.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    outputRange: [1, 0.88, 1, 0.88, 1, 0.88, 1],
    extrapolate: 'clamp',
  }), [])

  const handlePress = useCallback((id: InitState['navActiveId']) => {
    if (id != activeId) hapticTick()
    setNavActiveId(id)
  }, [activeId])

  if (autoHidePlayBar && keyboardShown) {
    return null
  }

  return (
    <View
      style={{
        ...styles.container,
        paddingHorizontal: CONTAINER_PAD_H,
        paddingBottom: 8 + navBarHeight,
        backgroundColor: theme['m3-surface-container-low'],
      }}
    >
      <View style={styles.tabsRow} onLayout={handleRowLayout}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: PILL_WIDTH,
            height: PILL_HEIGHT,
            borderRadius: M3Radius.full,
            backgroundColor: theme['m3-secondary-container'],
            transform: [
              { translateX: pillTranslateX },
              { scaleX: pillScaleX },
              { scaleY: pillScaleY },
            ],
          }}
        />
        {BOTTOM_NAV_MENUS.map((menu, index) => (
          <NavTab
            key={menu.id}
            index={index}
            id={menu.id}
            icon={menu.icon}
            label={t(menu.id)}
            active={activeId == menu.id}
            onPress={handlePress}
          />
        ))}
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '400',
  },
  labelActive: {
    fontWeight: '700',
  },
})
