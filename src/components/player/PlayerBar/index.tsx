import { memo, useMemo } from 'react'
import { View } from 'react-native'
import { useHorizontalMode, useKeyboard } from '@/utils/hooks'

import Pic from './components/Pic'
import Title from './components/Title'
import PlayInfo from './components/PlayInfo'
import ControlBtn from './components/ControlBtn'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useNavigationBarHeight } from '@/store/common/hook'
import { M3Radius } from '@/theme/m3'


export default memo(({ isHome = false }: { isHome?: boolean }) => {
  const { keyboardShown } = useKeyboard()
  const isHorizontalMode = useHorizontalMode()
  const theme = useTheme()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const navBarHeight = useNavigationBarHeight()

  const playerComponent = useMemo(() => {
    const showBottomNav = isHome && !isHorizontalMode
    const marginBottom = showBottomNav ? 8 : (14 + navBarHeight)

    return (
      <View
        style={{
          ...styles.container,
          marginBottom,
          backgroundColor: theme['m3-surface-container-high'],
          borderColor: theme['m3-outline-variant'],
        }}
      >
        <Pic isHome={isHome} />
        <View style={styles.center}>
          <Title isHome={isHome} />
          <PlayInfo isHome={isHome} />
        </View>
        <View style={styles.right}>
          <ControlBtn />
        </View>
      </View>
    )
  }, [theme, isHome, isHorizontalMode, navBarHeight])

  return autoHidePlayBar && keyboardShown ? null : playerComponent
})


const styles = createStyle({
  container: {
    marginHorizontal: 10,
    marginTop: 4,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: M3Radius.lg,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  center: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 10,
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    paddingLeft: 6,
    gap: 4,
  },
})
