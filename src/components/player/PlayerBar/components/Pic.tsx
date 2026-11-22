import { useCallback, useEffect, useRef } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { navigations } from '@/navigation'
import { registerActivePlayerBarMeasurer, setPlayerBarPicRect } from '@/navigation/playerBarTarget'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useComponentIds, useNavActiveId, useNavigationBarHeight } from '@/store/common/hook'
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

export const getTopPlayerBarHostComponentId = () => {
  return commonState.componentIds.songlistDetail ??
    commonState.componentIds.setting ??
    commonState.componentIds.home!
}

export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const winSize = useWindowSize()
  const navActiveId = useNavActiveId()
  const navBarHeight = useNavigationBarHeight()
  const componentIds = useComponentIds()
  const picWrapRef = useRef<View>(null)

  const isTopHost = isHome
    ? (!componentIds.songlistDetail && !componentIds.setting)
    : Boolean(componentIds.songlistDetail ?? componentIds.setting)

  const measurePic = useCallback(() => {
    if (!isTopHost) return
    picWrapRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        setPlayerBarPicRect({ x, y, width, height })
      }
    })
  }, [isTopHost])

  useEffect(() => {
    if (!isTopHost) return
    registerActivePlayerBarMeasurer(measurePic)
    const timer = setTimeout(measurePic, 60)
    return () => {
      clearTimeout(timer)
    }
  }, [isTopHost, measurePic, winSize.width, winSize.height, navActiveId, navBarHeight])

  const handlePress = () => {
    if (!musicInfo.id) return
    measurePic()
    navigations.pushPlayDetailScreen(getTopPlayerBarHostComponentId())
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
        <Image
          url={musicInfo.pic}
          nativeID={isTopHost ? NAV_SHEAR_NATIVE_IDS.playDetail_pic : undefined}
          style={styles.image}
          onError={handleError}
        />
      </View>
    </TouchableOpacity>
  )
}
