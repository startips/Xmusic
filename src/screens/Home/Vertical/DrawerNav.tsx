import { memo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useI18n } from '@/lang'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import { confirmDialog, createStyle, exitApp as backHome } from '@/utils/tools'
import { NAV_MENUS } from '@/config/constant'
import type { InitState } from '@/store/common/state'
// import { navigations } from '@/navigation'
// import commonState from '@/store/common/state'
import { exitApp, setNavActiveId } from '@/core/common'
import Text from '@/components/common/Text'
import { XmusicMark } from '@/components/common/XmusicMark'
import { useSettingValue } from '@/store/setting/hook'
import { M3Radius } from '@/theme/m3'

const styles = createStyle({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: M3Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: '700',
    marginLeft: 14,
  },
  menus: {
    flex: 1,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: M3Radius.full,
    alignItems: 'center',
  },
  footerWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  iconContent: {
    width: 24,
    alignItems: 'center',
  },
  text: {
    paddingLeft: 16,
  },
})

const Header = () => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  return (
    <View style={{ paddingTop: statusBarHeight, backgroundColor: theme['m3-surface-container'] }}>
      <View style={styles.header}>
        <View style={{ ...styles.brandBadge, backgroundColor: theme['m3-primary-container'] }}>
          <XmusicMark size={44} />
        </View>
        <Text style={styles.headerText} size={24} color={theme['m3-on-surface']}>Xmusic</Text>
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
  const t = useI18n()
  const activeId = useNavActiveId()
  const theme = useTheme()

  return activeId == id
    ? <View style={{ ...styles.menuItem, backgroundColor: theme['m3-secondary-container'] }}>
        <View style={styles.iconContent}>
          <Icon name={icon} size={20} color={theme['m3-on-secondary-container']} />
        </View>
        <Text style={{ ...styles.text, fontWeight: '600' }} color={theme['m3-on-secondary-container']}>{t(id)}</Text>
      </View>
    : <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => { onPress(id) }}>
        <View style={styles.iconContent}>
          <Icon name={icon} size={20} color={theme['m3-on-surface-variant']} />
        </View>
        <Text style={styles.text} color={theme['m3-on-surface']}>{t(id)}</Text>
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
    <View style={{ ...styles.container, backgroundColor: theme['m3-surface-container-low'] }}>
      <Header />
      <ScrollView style={styles.menus}>
        <View style={styles.list}>
          {NAV_MENUS.map(menu => <MenuItem key={menu.id} id={menu.id} icon={menu.icon} onPress={handlePress} />)}
        </View>
      </ScrollView>

      <View style={styles.footerWrap}>
        {
          showBackBtn ? <MenuItem id="back_home" icon="home" onPress={handlePress} /> : null
        }
        {
          showExitBtn ? <MenuItem id="nav_exit" icon="exit2" onPress={handlePress} /> : null
        }
      </View>
    </View>
  )
})

