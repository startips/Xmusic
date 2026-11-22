import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import FadeImage from '@/components/common/FadeImage'
import { useStatusbarHeight } from '@/store/common/hook'
import { useWindowSize } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { HEADER_HEIGHT, getVerticalHeaderTopExtra } from './components/Header'

export default memo(({ componentId }: { componentId: string }) => {
  const musicInfo = usePlayerMusicInfo()
  const statusBarHeight = useStatusbarHeight()
  const winSize = useWindowSize()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)

  useEffect(() => {
    if (animated || !pic) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated, pic])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  const topInset = statusBarHeight + getVerticalHeaderTopExtra(winSize.height) + Math.round(HEADER_HEIGHT * 0.52)
  const targetHeight = Math.round(winSize.width * 1.34)

  return (
    <View style={{ ...styles.wrapper, paddingTop: topInset }}>
      <View style={styles.stage}>
        <FadeImage
          url={pic}
          nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
          topFadeStart={0}
          topFadeEnd={0.34}
          fadeStart={0.66}
          fadeEnd={1}
          startCornerRadius={12}
          style={{ ...styles.image, height: targetHeight }}
        />
      </View>
    </View>
  )
})

const styles = createStyle({
  wrapper: {
    flex: 1,
    width: '100%',
  },
  stage: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    maxHeight: '100%',
    borderRadius: 0,
  },
})
