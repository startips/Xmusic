import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import FadeImage from '@/components/common/FadeImage'
import { createStyle } from '@/utils/tools'

export default memo(({ componentId }: { componentId: string }) => {
  const musicInfo = usePlayerMusicInfo()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)

  useEffect(() => {
    if (animated || !pic) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated, pic])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  return (
    <View style={styles.container}>
      <FadeImage
        url={pic}
        nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
        topFadeStart={0.04}
        topFadeEnd={0.22}
        fadeStart={0.54}
        fadeEnd={0.98}
        startCornerRadius={12}
        style={styles.image}
      />
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
})
