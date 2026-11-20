import { useCallback, useEffect, useRef } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { navigations } from '@/navigation'
import { setPlayerBarPicRect } from '@/navigation/playerBarTarget'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useWindowSize } from '@/utils/hooks'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'

const PIC_HEIGHT = scaleSizeH(44)

const styles = StyleSheet.create({
  image: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },
})

export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const winSize = useWindowSize()
  const picWrapRef = useRef<View>(null)

  const measurePic = useCallback(() => {
    picWrapRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setPlayerBarPicRect({ x, y, width, height })
      }
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(measurePic, 50)
    return () => { clearTimeout(timer) }
  }, [measurePic, winSize.width, winSize.height])

  const handlePress = () => {
    if (!musicInfo.id) return
    measurePic()
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)
  }

  const handleLongPress = () => {
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const handleError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({
      pic: null,
    })
  }, [])

  return (
    <TouchableOpacity onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7}>
      <View ref={picWrapRef} collapsable={false} onLayout={measurePic}>
        <Image url={musicInfo.pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} onError={handleError} />
      </View>
    </TouchableOpacity>
  )
}
