import { useLayoutEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { isUpdateAvailable, useHasNewVersion } from '@/store/version/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { Icon } from '@/components/common/Icon'
import { ExpressiveIconButton } from '@/components/common/m3e/ExpressiveButton'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import SearchTypeSelector from '@/screens/Home/Views/Search/SearchTypeSelector'
import { navigations } from '@/navigation'
import { M3Radius } from '@/theme/m3'
import { HOME_NAV_INDEX_MAP } from './pagerMotion'

const TOP_BAR_HEIGHT = 52

const headerComponents: Partial<Record<CommonState['navActiveId'], React.ReactNode>> = {
  nav_search: <SearchTypeSelector />,
}

const Header = () => {
  const theme = useTheme()
  const id = useNavActiveId()
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const hasNewVersion = useHasNewVersion()
  const badgeColor = theme.isDark ? '#FF453A' : '#E53935'

  const prevIdRef = useRef(id)
  const headerTranslateX = useRef(new Animated.Value(0)).current
  const headerOpacity = useRef(new Animated.Value(1)).current

  useLayoutEffect(() => {
    if (prevIdRef.current === id) return
    const prevIdx = HOME_NAV_INDEX_MAP[prevIdRef.current] ?? 0
    const nextIdx = HOME_NAV_INDEX_MAP[id] ?? 0
    const direction = nextIdx >= prevIdx ? 1 : -1
    prevIdRef.current = id
    headerTranslateX.stopAnimation()
    headerOpacity.stopAnimation()
    headerTranslateX.setValue(direction * 14)
    headerOpacity.setValue(0)
    Animated.parallel([
      Animated.timing(headerTranslateX, {
        toValue: 0,
        duration: 220,
        easing: Easing.bezier(0.05, 0.7, 0.1, 1.0),
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [headerOpacity, headerTranslateX, id])

  const handleOpenSetting = () => {
    if (Boolean(commonState.componentIds.setting) || !commonState.componentIds.home) return
    if (isUpdateAvailable()) {
      global.lx.settingActiveId = 'about'
    }
    navigations.pushSettingScreen(commonState.componentIds.home)
  }

  const rightAccessory = headerComponents[id]

  return (
    <>
      <StatusBar />
      <View
        style={{
          ...styles.container,
          height: scaleSizeH(TOP_BAR_HEIGHT) + statusBarHeight,
          paddingTop: statusBarHeight,
        }}
      >
        <View style={styles.left}>
          <Animated.View style={{ opacity: headerOpacity, transform: [{ translateX: headerTranslateX }] }}>
            <Text
              style={styles.title}
              size={21}
              color={theme['m3-on-surface']}
              numberOfLines={1}
            >
              {t(id)}
            </Text>
          </Animated.View>
        </View>
        <View style={styles.right}>
          {rightAccessory
            ? (
                <Animated.View style={{ opacity: headerOpacity, transform: [{ translateX: headerTranslateX }] }}>
                  {rightAccessory}
                </Animated.View>
              )
            : null}
          <ExpressiveIconButton
            size={40}
            backgroundColor={theme['m3-surface-container']}
            onPress={handleOpenSetting}
          >
            <Icon color={theme['m3-on-surface-variant']} name="setting" size={17} />
            {hasNewVersion
              ? (
                  <View
                    pointerEvents="none"
                    style={{
                      ...styles.updateDot,
                      backgroundColor: badgeColor,
                      borderColor: theme['m3-surface-container'],
                    }}
                  />
                )
              : null}
          </ExpressiveIconButton>
        </View>
      </View>
    </>
  )
}

const styles = createStyle({
  container: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingRight: 8,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: '100%',
  },
  updateDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: M3Radius.full,
    borderWidth: 1.5,
  },
  title: {
    fontWeight: '700',
  },
  backTitle: {
    fontWeight: '700',
    marginLeft: 10,
  },
})

export default Header
