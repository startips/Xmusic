import { memo, useMemo, useRef } from 'react'

import { View, StyleSheet } from 'react-native'

import { navigations } from '@/navigation'
import StatusBar from '@/components/common/StatusBar'
import { useTheme } from '@/store/theme/hook'
import { usePlayerMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'
import { useStatusbarHeight } from '@/store/common/hook'
import Btn from './Btn'
import LinearGradientOverlay from '@/components/common/LinearGradientOverlay'
import { withAlpha } from '@/theme/m3'

export const HEADER_HEIGHT = scaleSizeH(52)


const Title = () => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()


  return (
    <View style={styles.titleContent}>
      <Text numberOfLines={1} size={16} style={styles.title} color={theme['m3-on-surface']}>{musicInfo.name}</Text>
      <Text numberOfLines={1} style={styles.subtitle} size={12} color={theme['m3-on-surface-variant']}>{musicInfo.singer}</Text>
    </View>
  )
}

export default memo(() => {
  const popupRef = useRef<SettingPopupType>(null)
  const statusBarHeight = useStatusbarHeight()
  const theme = useTheme()

  const back = () => {
    navigations.popPlayDetailScreen(commonState.componentIds.playDetail!)
  }
  const showSetting = () => {
    popupRef.current?.show()
  }

  const scrimColors = useMemo(() => {
    const base = theme['m3-background']
    return [withAlpha(base, 0.85), withAlpha(base, 0.42), withAlpha(base, 0)]
  }, [theme])

  return (
    <View
      style={{
        ...styles.wrapper,
        height: HEADER_HEIGHT + statusBarHeight,
        paddingTop: statusBarHeight,
      }}
      nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}
      pointerEvents="box-none"
    >
      <LinearGradientOverlay
        pointerEvents="none"
        colors={scrimColors}
        locations={[0, 0.62, 1]}
        style={{ ...styles.scrim, height: HEADER_HEIGHT + statusBarHeight + 20 }}
      />
      <StatusBar />
      <View style={styles.container}>
        <Btn icon="chevron-left" onPress={back} />
        <Title />
        <Btn icon="slider" onPress={showSetting} />
      </View>
      <SettingPopup ref={popupRef} direction="vertical" />
    </View>
  )
})


const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
    height: '100%',
  },
  titleContent: {
    flex: 1,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 1,
  },
  icon: {
    paddingLeft: 4,
    paddingRight: 4,
  },
})
