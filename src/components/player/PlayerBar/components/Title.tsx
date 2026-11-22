import { TouchableOpacity } from 'react-native'
import { navigations } from '@/navigation'
import { measureActivePlayerBarPic } from '@/navigation/playerBarTarget'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import playerState from '@/store/player/state'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import { createStyle, formatMusicName } from '@/utils/tools'
import { getTopPlayerBarHostComponentId } from './Pic'

export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const downloadFileName = useSettingValue('download.fileName')
  const theme = useTheme()

  const handlePress = () => {
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

  const hasMusic = Boolean(musicInfo.id)
  const title = hasMusic
    ? musicInfo.singer
      ? formatMusicName(downloadFileName, musicInfo.name, musicInfo.singer)
      : musicInfo.name
    : 'Xmusic'

  return (
    <TouchableOpacity style={styles.container} onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7}>
      <Text
        size={hasMusic ? 14 : 13}
        style={hasMusic ? styles.titleText : styles.idleText}
        color={hasMusic ? theme['m3-on-surface'] : theme['m3-on-surface-variant']}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  titleText: {
    fontWeight: '600',
  },
  idleText: {
    fontWeight: '500',
  },
})
