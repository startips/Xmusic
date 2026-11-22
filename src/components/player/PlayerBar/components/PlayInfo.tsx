import { useCallback, useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'

import Progress, { ProgressPlain } from '@/components/player/Progress'
import Status from './Status'
import { usePlayerMusicInfo, useProgress } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { COMPONENT_IDS, LIST_IDS } from '@/config/constant'
import { usePageVisible } from '@/store/common/hook'
import { scaleSizeH, scaleSizeW, scaleSizeWR } from '@/utils/pixelRatio'
import { useBufferProgress } from '@/plugins/player'
import { useSettingValue } from '@/store/setting/hook'
import { navigations } from '@/navigation'
import { measureActivePlayerBarPic } from '@/navigation/playerBarTarget'
import playerState from '@/store/player/state'
import { getTopPlayerBarHostComponentId } from './Pic'

const FONT_SIZE = 11
const PADDING_TOP_RAW = 1.8
const PADDING_TOP = Math.round(scaleSizeWR(PADDING_TOP_RAW))
const MARGIN_TOP = Math.round(scaleSizeH(2))
const PADDING_TOP_PROGRESS = PADDING_TOP + MARGIN_TOP

export default ({ isHome }: { isHome: boolean }) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  const [autoUpdate, setAutoUpdate] = useState(true)
  const { maxPlayTimeStr, nowPlayTimeStr, progress, maxPlayTime } = useProgress(autoUpdate)
  const buffered = useBufferProgress()
  const allowProgressBarSeek = useSettingValue('common.allowProgressBarSeek')

  usePageVisible([COMPONENT_IDS.home], useCallback((visible) => {
    if (isHome) setAutoUpdate(visible)
  }, [isHome]))

  const handleOpenDetail = () => {
    if (!musicInfo.id) return
    measureActivePlayerBarPic()
    navigations.pushPlayDetailScreen(getTopPlayerBarHostComponentId())
  }

  const handleLongPress = () => {
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const innerContent = (
    <>
      <View style={styles.status}>
        <Status autoUpdate={autoUpdate} />
      </View>
      <View style={stylesRaw.timeRow}>
        <Text style={stylesRaw.timeText} size={FONT_SIZE} color={theme['m3-on-surface-variant']}>
          {nowPlayTimeStr} / {maxPlayTimeStr}
        </Text>
      </View>
      <View pointerEvents={allowProgressBarSeek ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, stylesRaw.progress]}>
        {
          allowProgressBarSeek
            ? <Progress progress={progress} duration={maxPlayTime} buffered={buffered} paddingTop={PADDING_TOP_PROGRESS} />
            : <ProgressPlain progress={progress} duration={maxPlayTime} buffered={buffered} paddingTop={PADDING_TOP_PROGRESS} />
        }
      </View>
    </>
  )

  if (allowProgressBarSeek) {
    return <View style={stylesRaw.container}>{innerContent}</View>
  }

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={handleOpenDetail} onLongPress={handleLongPress} style={stylesRaw.container}>
      {innerContent}
    </TouchableOpacity>
  )
}

const styles = createStyle({
  status: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 5,
  },
})

const stylesRaw = StyleSheet.create({
  container: {
    maxHeight: scaleSizeH(32),
    flexGrow: 1,
    flexShrink: 0,
    paddingTop: PADDING_TOP,
    paddingHorizontal: scaleSizeW(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
    paddingRight: scaleSizeW(3),
  },
  progress: {
    marginBottom: MARGIN_TOP,
    zIndex: 100,
  },
})
