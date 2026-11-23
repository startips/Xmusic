import { useLayoutEffect, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import { useSettingValue } from '@/store/setting/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT } from '@/config/constant'
import { type InitState as CommonState } from '@/store/common/state'
import SearchTypeSelector from '@/screens/Home/Views/Search/SearchTypeSelector'
import { HOME_NAV_INDEX_MAP } from '../Vertical/pagerMotion'

const headerComponents: Partial<Record<CommonState['navActiveId'], React.ReactNode>> = {
  nav_search: <SearchTypeSelector />,
}

const HEADER_HEIGHT = _HEADER_HEIGHT * 0.8

const useHorizontalHeaderMotion = (id: CommonState['navActiveId']) => {
  const prevIdRef = useRef(id)
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current

  useLayoutEffect(() => {
    if (prevIdRef.current === id) return
    const prevIdx = HOME_NAV_INDEX_MAP[prevIdRef.current] ?? 0
    const nextIdx = HOME_NAV_INDEX_MAP[id] ?? 0
    const direction = nextIdx >= prevIdx ? 1 : -1
    prevIdRef.current = id
    translateY.stopAnimation()
    opacity.stopAnimation()
    translateY.setValue(direction * 10)
    opacity.setValue(0)
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.bezier(0.05, 0.7, 0.1, 1.0),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [id, opacity, translateY])

  return { opacity, translateY }
}

const SideHeader = ({ titleStyle }: { titleStyle: typeof styles.leftTitle | typeof styles.rightTitle }) => {
  const id = useNavActiveId()
  const theme = useTheme()
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const { opacity, translateY } = useHorizontalHeaderMotion(id)
  const rightAccessory = headerComponents[id]

  return (
    <View style={{
      ...styles.container,
      height: scaleSizeH(HEADER_HEIGHT) + statusBarHeight,
      paddingTop: statusBarHeight,
    }}>
      <View style={styles.left}>
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
          <Text style={titleStyle} size={18} color={theme['m3-on-surface']}>{t(id)}</Text>
        </Animated.View>
      </View>
      {rightAccessory
        ? (
            <Animated.View style={{ opacity, transform: [{ translateY }] }}>
              {rightAccessory}
            </Animated.View>
          )
        : null}
    </View>
  )
}

const Header = () => {
  const drawerLayoutPosition = useSettingValue('common.drawerLayoutPosition')

  return (
    <>
      <StatusBar />
      <SideHeader titleStyle={drawerLayoutPosition == 'left' ? styles.leftTitle : styles.rightTitle} />
    </>
  )
}


const styles = createStyle({
  container: {
    // width: '100%',
    paddingRight: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 10,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 5,
    alignItems: 'center',
    height: '100%',
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  btn: {
    // flex: 1,
    width: HEADER_HEIGHT,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  titleBtn: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    height: '100%',
    justifyContent: 'center',
  },
  leftTitle: {
    paddingLeft: 10,
    paddingRight: 16,
    fontWeight: '700',
  },
  rightTitle: {
    paddingLeft: 16,
    paddingRight: 16,
    fontWeight: '700',
  },
})

export default Header
