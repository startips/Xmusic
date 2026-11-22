import { memo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useNavActiveId, useNavigationBarHeight, useSafeAreaInsets } from '@/store/common/hook'
import { isUpdateAvailable, useHasNewVersion } from '@/store/version/hook'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import { XmusicMark } from '@/components/common/XmusicMark'
import { createStyle } from '@/utils/tools'
import { NAV_MENUS } from '@/config/constant'
import commonState, { type InitState } from '@/store/common/state'
import { setNavActiveId } from '@/core/common'
import { navigations } from '@/navigation'
import { M3Radius } from '@/theme/m3'
import { scaleSizeW } from '@/utils/pixelRatio'

const NAV_WIDTH = 74
const SCALED_NAV_WIDTH = scaleSizeW(NAV_WIDTH)

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
  list: {
    paddingBottom: 15,
    gap: 6,
  },
  menuItem: {
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContent: {
    width: 50,
    height: 32,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateDot: {
    position: 'absolute',
    top: 3,
    right: 10,
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

const MenuItem = ({ id, icon, onPress }: {
  id: IdType
  icon: string
  onPress: (id: IdType) => void
}) => {
  const activeId = useNavActiveId()
  const theme = useTheme()
  const active = activeId == id

  return active
    ? <View style={styles.menuItem}>
        <View style={{ ...styles.iconContent, backgroundColor: theme['m3-secondary-container'] }}>
          <Icon name={icon} size={19} color={theme['m3-on-secondary-container']} />
        </View>
      </View>
    : <TouchableOpacity style={styles.menuItem} onPress={() => { onPress(id) }}>
        <View style={styles.iconContent}>
          <Icon name={icon} size={19} color={theme['m3-on-surface-variant']} />
        </View>
      </TouchableOpacity>
}

export default memo(() => {
  const theme = useTheme()
  const navBarHeight = useNavigationBarHeight()
  const safeInsets = useSafeAreaInsets()
  const hasNewVersion = useHasNewVersion()
  const badgeColor = theme.isDark ? '#FF453A' : '#E53935'

  const handlePress = (id: IdType) => {
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
      <ScrollView style={styles.menus}>
        <View style={styles.list}>
          {NAV_MENUS.map(menu => <MenuItem key={menu.id} id={menu.id} icon={menu.icon} onPress={handlePress} />)}
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.menuItem} onPress={handleOpenSetting}>
        <View style={styles.iconContent}>
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
        </View>
      </TouchableOpacity>
    </View>
  )
})

