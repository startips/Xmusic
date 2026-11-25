import { useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'

import Progress, { ProgressPlain } from '@/components/player/Progress'
import Status from './Status'
import { usePlayerMusicInfo, useProgress } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { useBufferProgress } from '@/plugins/player'
import { useSettingValue } from '@/store/setting/hook'
import { navigations } from '@/navigation'
import { measureActivePlayerBarPic } from '@/navigation/playerBarTarget'
import playerState from '@/store/player/state'
import { getTopPlayerBarHostComponentId } from './Pic'

const FONT_SIZE = 11

const checkPlayInfoVisible = (ids: CommonState['componentIds'], isHome: boolean) => {
  if (isHome) {
    return !ids.songlistDetail && !ids.setting && !ids.playDetail && !ids.comment
  }
  return !ids.playDetail && !ids.comment
}

export default ({ isHome }: { isHome: boolean }) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  const [autoUpdate, setAutoUpdate] = useState(() => checkPlayInfoVisible(commonState.componentIds, isHome))
  const { maxPlayTimeStr, nowPlayTimeStr, progress, maxPlayTime } = useProgress(autoUpdate)
  const buffered = useBufferProgress()
  const allowProgressBarSeek = useSettingValue('common.allowProgressBarSeek')

  useEffect(() => {
    const handleComponentIdsUpdated = (ids: CommonState['componentIds']) => {
      setAutoUpdate(checkPlayInfoVisible(ids, isHome))
    }
    setAutoUpdate(checkPlayInfoVisible(commonState.componentIds, isHome))
    global.state_event.on('componentIdsUpdated', handleComponentIdsUpdated)
    return () => {
      global.state_event.off('componentIdsUpdated', handleComponentIdsUpdated)
    }
  }, [isHome])

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

  const infoRow = (
    <View style={stylesRaw.infoRow}>
      <View style={styles.status}>
        <Status autoUpdate={autoUpdate} />
      </View>
      <View style={stylesRaw.timeRow}>
        <Text style={stylesRaw.timeText} size={FONT_SIZE} color={theme['m3-on-surface-variant']}>
          {nowPlayTimeStr} / {maxPlayTimeStr}
        </Text>
      </View>
    </View>
  )

  const progressRow = (
    <View pointerEvents={allowProgressBarSeek ? 'auto' : 'none'} style={stylesRaw.progressRow}>
      {
        allowProgressBarSeek
          ? <Progress progress={progress} duration={maxPlayTime} buffered={buffered} active={autoUpdate} />
          : <ProgressPlain progress={progress} duration={maxPlayTime} buffered={buffered} active={autoUpdate} />
      }
    </View>
  )

  if (allowProgressBarSeek) {
    return (
      <View style={stylesRaw.container}>
        <TouchableOpacity activeOpacity={0.75} onPress={handleOpenDetail} onLongPress={handleLongPress}>
          {infoRow}
        </TouchableOpacity>
        {progressRow}
      </View>
    )
  }

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={handleOpenDetail} onLongPress={handleLongPress} style={stylesRaw.container}>
      {infoRow}
      {progressRow}
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
    flexGrow: 1,
    flexShrink: 0,
    paddingTop: scaleSizeH(1),
    paddingHorizontal: scaleSizeW(2),
    flexDirection: 'column',
    justifyContent: 'center',
  },
  infoRow: {
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
  },
  progressRow: {
    height: scaleSizeH(9),
    marginTop: scaleSizeH(2),
    width: '100%',
  },
})
