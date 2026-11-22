import playerActions from '@/store/player/action'
import playerState from '@/store/player/state'
import { playNext } from './player'


/**
 * 添加歌曲到稍后播放列表
 * @param list 歌曲列表
 */
export const addTempPlayList = (list: LX.Player.TempPlayListItem[]) => {
  playerActions.addTempPlayList(list)
  if (!playerState.playMusicInfo.musicInfo) void playNext()
}
/**
 * 从稍后播放列表移除歌曲
 * @param index 歌曲位置
 */
export const removeTempPlayList = (index: number) => {
  playerActions.removeTempPlayList(index)
}
/**
 * 将稍后播放歌曲置顶
 */
export const promoteTempPlayList = (index: number) => {
  playerActions.promoteTempPlayList(index)
}
/**
 * 清空稍后播放列表
 */
export const clearTempPlayeList = () => {
  playerActions.clearTempPlayeList()
}
