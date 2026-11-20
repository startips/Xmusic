import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import Image from '@/components/common/Image'
import AlphaFadeView from '@/components/common/AlphaFadeView'
import { createStyle } from '@/utils/tools'

export default memo(({ componentId }: { componentId: string }) => {
  const musicInfo = usePlayerMusicInfo()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)

  useEffect(() => {
    if (animated) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  return (
    <View style={styles.container}>
      <AlphaFadeView
        topFadeStart={0.035}
        topFadeEnd={0.215}
        fadeStart={0.55}
        fadeEnd={1}
        style={styles.fade}
      >
        <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} />
      </AlphaFadeView>
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  fade: {
    flex: 1,
    width: '100%',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
})
