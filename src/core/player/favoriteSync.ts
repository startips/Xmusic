import { LIST_IDS } from '@/config/constant'
import { addListMusics, getListMusics, removeListMusics } from '@/core/list'
import { setFavoriteNotificationState } from '@/plugins/player/utils'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'

export const resolveCurrentPlayMusicInfo = (): LX.Music.MusicInfo | null => {
  const info = playerState.playMusicInfo.musicInfo
  if (!info) return null
  return 'progress' in info ? info.metadata.musicInfo : info
}

/**
 * Sync the current track's "我的收藏" status to Android MediaSession CustomAction.
 */
export const syncCurrentTrackFavoriteNotification = async(): Promise<boolean> => {
  const target = resolveCurrentPlayMusicInfo()
  if (!target) {
    setFavoriteNotificationState(false)
    return false
  }
  const musics = await getListMusics(LIST_IDS.LOVE)
  const loved = musics.some(m => m.id == target.id)
  setFavoriteNotificationState(loved)
  return loved
}

/**
 * Directly toggle/add the current track in "我的收藏" without prompting or showing modals.
 */
export const toggleCurrentTrackFavoriteSilently = async(): Promise<boolean> => {
  const target = resolveCurrentPlayMusicInfo()
  if (!target) return false
  const musics = await getListMusics(LIST_IDS.LOVE)
  const exists = musics.some(m => m.id == target.id)
  if (exists) {
    await removeListMusics(LIST_IDS.LOVE, [target.id])
    setFavoriteNotificationState(false)
    return false
  }
  await addListMusics(LIST_IDS.LOVE, [target], settingState.setting['list.addMusicLocationType'])
  setFavoriteNotificationState(true)
  return true
}
