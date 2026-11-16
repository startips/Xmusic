import { View, TouchableOpacity } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import { scaleSizeH } from '@/utils/pixelRatio'
import { setNavActiveId } from '@/core/common'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import SearchTypeSelector from '@/screens/Home/Views/Search/SearchTypeSelector'
import { M3Radius } from '@/theme/m3'

const TOP_BAR_HEIGHT = 50

const headerComponents: Partial<Record<CommonState['navActiveId'], React.ReactNode>> = {
  nav_search: <SearchTypeSelector />,
}

const Header = () => {
  const theme = useTheme()
  const id = useNavActiveId()
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const isSetting = id == 'nav_setting'

  const handleBack = () => {
    setNavActiveId(commonState.lastNavActiveId)
  }

  const handleOpenSetting = () => {
    setNavActiveId('nav_setting')
  }

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
          {isSetting
            ? (
                <TouchableOpacity
                  style={{ ...styles.iconBtn, backgroundColor: theme['m3-surface-container'] }}
                  activeOpacity={0.7}
                  onPress={handleBack}
                >
                  <Icon color={theme['m3-on-surface']} name="chevron-left" size={16} />
                </TouchableOpacity>
              )
            : null}
          <Text
            style={isSetting ? styles.backTitle : styles.title}
            size={21}
            color={theme['m3-on-surface']}
            numberOfLines={1}
          >
            {t(id)}
          </Text>
        </View>
        <View style={styles.right}>
          {headerComponents[id] ?? null}
          {!isSetting
            ? (
                <TouchableOpacity
                  style={{ ...styles.iconBtn, backgroundColor: theme['m3-surface-container'] }}
                  activeOpacity={0.7}
                  onPress={handleOpenSetting}
                >
                  <Icon color={theme['m3-on-surface-variant']} name="setting" size={17} />
                </TouchableOpacity>
              )
            : null}
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: M3Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
