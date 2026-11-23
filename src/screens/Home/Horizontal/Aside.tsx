import { memo, useMemo, useRef } from 'react'
import { Animated, Pressable, ScrollView, View } from 'react-native'
import { useNavActiveId, useNavigationBarHeight, useSafeAreaInsets } from '@/store/common/hook'
import { isUpdateAvailable, useHasNewVersion } from '@/store/version/hook'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import { ExpressiveIconButton } from '@/components/common/m3e/ExpressiveButton'
import { XmusicMark } from '@/components/common/XmusicMark'
import { createStyle } from '@/utils/tools'
import { NAV_MENUS } from '@/config/constant'
import commonState, { type InitState } from '@/store/common/state'
import { setNavActiveId } from '@/core/common'
import { navigations } from '@/navigation'
import { M3Motion, M3Radius } from '@/theme/m3'
import { hapticTick } from '@/utils/haptics'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { homePillProgress } from '../Vertical/pagerMotion'

const NAV_WIDTH = 74
const SCALED_NAV_WIDTH = scaleSizeW(NAV_WIDTH)
const ITEM_HEIGHT = scaleSizeH(44)
const ITEM_GAP = scaleSizeH(6)
const PILL_W = scaleSizeW(50)
const PILL_H = scaleSizeH(32)

const styles = createStyle({
  container: {
    flexGrow: 0,
    borderRightWidth: 0.6,
    paddingBottom: 12,
    width: NAV_WIDTH,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadge: {
    width: 40,
    height: 40,
    borderRadius: M3Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    textAlign: 'center',
    marginLeft: 16,
  },
  menus: {
    flex: 1,
  },
  menuItem: {
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8.5,
    height: 8.5,
    borderRadius: M3Radius.full,
    borderWidth: 1.5,
  },
  text: {
    paddingLeft: 15,
  },
})

const Header = () => {
  const theme = useTheme()
  const safeInsets = useSafeAreaInsets()
  return (
    <View style={{ paddingTop: Math.max(4, safeInsets.top) }}>
      <View style={styles.header}>
        <View style={[styles.brandBadge, { backgroundColor: theme['m3-primary-container'] }]}>
          <XmusicMark size={40} />
        </View>
      </View>
    </View>
  )
}

type IdType = InitState['navActiveId']

const MenuItem = memo(({ id, icon, onPress }: {
  id: IdType
  icon: string
  onPress: (id: IdType) => void
}) => {
  const activeId = useNavActiveId()
  const theme = useTheme()
  const pressScale = useRef(new Animated.Value(1)).current
  const active = activeId == id

  return (
    <Pressable
      style={{
        height: ITEM_HEIGHT,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={() => { onPress(id) }}
      onPressIn={() => { M3Motion.pressSpring(pressScale, 0.91).start() }}
      onPressOut={() => {
        Animated.spring(pressScale, {
          toValue: 1,
          ...M3Motion.expressiveBounce,
        }).start()
      }}
    >
      <Animated.View
        style={{
          width: PILL_W,
          height: PILL_H,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale: pressScale }],
        }}
      >
        <Icon
          name={icon}
          size={19}
          color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
        />
      </Animated.View>
    </Pressable>
  )
})

export default memo(() => {
  const theme = useTheme()
  const navBarHeight = useNavigationBarHeight()
  const safeInsets = useSafeAreaInsets()
  const hasNewVersion = useHasNewVersion()
  const badgeColor = theme.isDark ? '#FF453A' : '#E53935'

  const pillTranslateY = useMemo(() => homePillProgress.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 1, 2, 3].map(i => i * (ITEM_HEIGHT + ITEM_GAP) + (ITEM_HEIGHT - PILL_H) / 2),
    extrapolate: 'clamp',
  }), [])

  const pillScaleY = useMemo(() => homePillProgress.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    outputRange: [1, 1.18, 1, 1.18, 1, 1.18, 1],
    extrapolate: 'clamp',
  }), [])

  const pillScaleX = useMemo(() => homePillProgress.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3],
    outputRange: [1, 0.9, 1, 0.9, 1, 0.9, 1],
    extrapolate: 'clamp',
  }), [])

  const handlePress = (id: IdType) => {
    if (id != commonState.navActiveId) hapticTick()
    setNavActiveId(id)
  }

  const handleOpenSetting = () => {
    if (Boolean(commonState.componentIds.setting) || !commonState.componentIds.home) return
    if (isUpdateAvailable()) {
      global.lx.settingActiveId = 'about'
    }
    navigations.pushSettingScreen(commonState.componentIds.home)
  }

  return (
    <View
      style={{
        ...styles.container,
        width: SCALED_NAV_WIDTH + safeInsets.left,
        paddingLeft: safeInsets.left,
        paddingBottom: 12 + Math.max(navBarHeight, safeInsets.bottom),
        backgroundColor: theme['m3-surface-container-low'],
        borderRightColor: theme['m3-outline-variant'],
      }}
    >
      <Header />
      <ScrollView
        style={styles.menus}
        contentContainerStyle={{ paddingBottom: scaleSizeH(15), alignItems: 'center' }}
      >
        <View
          style={{
            width: SCALED_NAV_WIDTH,
            position: 'relative',
            alignItems: 'center',
            gap: ITEM_GAP,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: (SCALED_NAV_WIDTH - PILL_W) / 2,
              width: PILL_W,
              height: PILL_H,
              borderRadius: M3Radius.full,
              backgroundColor: theme['m3-secondary-container'],
              transform: [
                { translateY: pillTranslateY },
                { scaleY: pillScaleY },
                { scaleX: pillScaleX },
              ],
            }}
          />
          {NAV_MENUS.map(menu => <MenuItem key={menu.id} id={menu.id} icon={menu.icon} onPress={handlePress} />)}
        </View>
      </ScrollView>
      <View style={styles.menuItem}>
        <ExpressiveIconButton size={40} backgroundColor="transparent" onPress={handleOpenSetting}>
          <Icon name="setting" size={19} color={theme['m3-on-surface-variant']} />
          {hasNewVersion
            ? (
                <View
                  pointerEvents="none"
                  style={{
                    ...styles.updateDot,
                    backgroundColor: badgeColor,
                    borderColor: theme['m3-surface-container-low'],
                  }}
                />
              )
            : null}
        </ExpressiveIconButton>
      </View>
    </View>
  )
})

