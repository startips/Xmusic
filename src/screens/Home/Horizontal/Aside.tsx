import { memo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import { XmusicMark } from '@/components/common/XmusicMark'
import { confirmDialog, createStyle, exitApp as backHome } from '@/utils/tools'
import { NAV_MENUS } from '@/config/constant'
import type { InitState } from '@/store/common/state'
// import commonState from '@/store/common/state'
import { exitApp, setNavActiveId } from '@/core/common'
import { useSettingValue } from '@/store/setting/hook'
import { M3Radius } from '@/theme/m3'

const NAV_WIDTH = 74

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
  text: {
    paddingLeft: 15,
  },
})

const Header = () => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  return (
    <View style={{ paddingTop: statusBarHeight }}>
      <View style={styles.header}>
        <View style={[styles.brandBadge, { backgroundColor: theme['m3-primary-container'] }]}>
          <XmusicMark size={40} />
        </View>
      </View>
    </View>
  )
}

type IdType = InitState['navActiveId'] | 'nav_exit' | 'back_home'

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
  // console.log('render drawer nav')
  const showBackBtn = useSettingValue('common.showBackBtn')
  const showExitBtn = useSettingValue('common.showExitBtn')

  const handlePress = (id: IdType) => {
    switch (id) {
      case 'nav_exit':
        void confirmDialog({
          message: global.i18n.t('exit_app_tip'),
          confirmButtonText: global.i18n.t('list_remove_tip_button'),
        }).then(isExit => {
          if (!isExit) return
          exitApp('Exit Btn')
        })
        return
      case 'back_home':
        backHome()
        return
    }

    global.app_event.changeMenuVisible(false)
    setNavActiveId(id)
  }

  return (
    <View
      style={{
        ...styles.container,
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
      {
        showBackBtn ? <MenuItem id="back_home" icon="home" onPress={handlePress} /> : null
      }
      {
        showExitBtn ? <MenuItem id="nav_exit" icon="exit2" onPress={handlePress} /> : null
      }
    </View>
  )
})

