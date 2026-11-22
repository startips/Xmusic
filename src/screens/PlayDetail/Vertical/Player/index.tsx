import { memo } from 'react'
import { View } from 'react-native'

// import Title from './components/Title'
import MoreBtn from './components/MoreBtn'
import PlayInfo from './components/PlayInfo'
import ControlBtn from './components/ControlBtn'
import { createStyle } from '@/utils/tools'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useNavigationBarHeight, useSafeAreaInsets } from '@/store/common/hook'
import { useWindowSize } from '@/utils/hooks'


export default memo(() => {
  const navBarHeight = useNavigationBarHeight()
  const safeInsets = useSafeAreaInsets()
  const winSize = useWindowSize()
  const bottomExtra = Math.round(Math.min(76, Math.max(44, winSize.height * 0.078)))
  const bottomPadding = Math.max(navBarHeight, safeInsets.bottom) + bottomExtra

  return (
    <View style={{ ...styles.container, paddingBottom: bottomPadding }} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_player}>
      <MoreBtn />
      <PlayInfo />
      <ControlBtn />
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 0,
    width: '100%',
    // paddingTop: progressContentPadding,
    // marginTop: -progressContentPadding,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
    paddingHorizontal: 24,
    paddingBottom: 14,
    paddingTop: 0,
    // backgroundColor: AppColors.primary,
    // backgroundColor: 'red',
    flexDirection: 'column',
  },
  status: {
    marginTop: 10,
    flexDirection: 'column',
    flex: 0,
    paddingLeft: 5,
    justifyContent: 'space-evenly',
    // backgroundColor: 'rgba(0, 0, 0, .1)',
  },
})
