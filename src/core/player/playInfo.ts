import playerActions from '@/store/player/action'
import playerState, { type LyricStatus } from '@/store/player/state'
import settingState from '@/store/setting/state'

import { getListMusicSync } from '@/utils/listManage'
import { setProgress } from '@/core/player/progress'
import { LIST_IDS } from '@/config/constant'
import { getPlayQuality } from '@/core/music/utils'
import { extractOnlineMusicInfo, isQualityDowngraded } from '@/utils/quality'


export const setMusicInfo = (musicInfo: Partial<LX.Player.MusicInfo>) => {
  playerActions.setMusicInfo(musicInfo)
}

export const setLyricStatus = (status: LyricStatus) => {
  playerActions.setLyricStatus(status)
}

export const setPlayQualityInfo = (info: Partial<LX.Player.PlayQualityInfo>) => {
  playerActions.setPlayQualityInfo(info)
}

export const resetPlayQualityInfo = () => {
  playerActions.resetPlayQualityInfo()
}

export const setPlayAudioFormat = (audioFormat: LX.Player.AudioFormatInfo | null) => {
  if (!playerState.playMusicInfo.musicInfo) return
  playerActions.setPlayQualityInfo({ audioFormat })
}

export const initPlayQualityInfoForTrack = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem | null) => {
  if (!musicInfo) {
    playerActions.resetPlayQualityInfo()
    return
  }
  const onlineInfo = extractOnlineMusicInfo(musicInfo)
  if (!onlineInfo) {
    const ext = !('progress' in musicInfo) && musicInfo.source === 'local' ? (musicInfo.meta.ext || null) : null
    playerActions.setPlayQualityInfo({
      musicId: musicInfo.id,
      targetQuality: null,
      requestedQuality: null,
      actualQuality: null,
      source: 'local',
      actualSource: 'local',
      isSourceToggled: false,
      isDowngraded: false,
      localExt: ext,
      audioFormat: null,
      isSwitching: false,
    })
    return
  }
  const targetQuality = settingState.setting['player.playQuality']
  const activeInfo = onlineInfo.meta.toggleMusicInfo ?? onlineInfo
  const requestedQuality = getPlayQuality(targetQuality, activeInfo)
  playerActions.setPlayQualityInfo({
    musicId: musicInfo.id,
    targetQuality,
    requestedQuality,
    actualQuality: requestedQuality,
    source: onlineInfo.source,
    actualSource: activeInfo.source,
    isSourceToggled: activeInfo.source !== onlineInfo.source,
    isDowngraded: isQualityDowngraded(targetQuality, requestedQuality),
    localExt: null,
    audioFormat: null,
    isSwitching: false,
  })
}

export const setLoadErrorPicUrl = (url: string) => {
  playerActions.setLoadErrorPicUrl(url)
}

export const setLastLyric = (lrc?: string) => {
  playerActions.setLastLyric(lrc)
}

export const setPlayListId = (listId: string | null) => {
  playerActions.setPlayListId(listId)
}


/**
 * 更新播放位置
 * @returns 播放位置
 */
export const updatePlayIndex = () => {
  const indexInfo = getPlayIndex(playerState.playMusicInfo.listId, playerState.playMusicInfo.musicInfo, playerState.playMusicInfo.isTempPlay)
  // console.log('indexInfo', indexInfo)
  playerActions.updatePlayIndex(indexInfo.playIndex, indexInfo.playerPlayIndex)
  return indexInfo
}


export const getPlayIndex = (listId: string | null, musicInfo: LX.Download.ListItem | LX.Music.MusicInfo | null, isTempPlay: boolean): {
  playIndex: number
  playerPlayIndex: number
} => {
  const { playInfo } = playerState
  const playerList = getListMusicSync(playInfo.playerListId)

  // if (listIndex < 0) throw new Error('music info not found')
  // playInfo.playIndex = listIndex

  let playIndex = -1
  let playerPlayIndex = -1
  if (playerList.length) {
    playerPlayIndex = Math.min(playInfo.playerPlayIndex, playerList.length - 1)
  }

  const list = getListMusicSync(listId)
  if (list.length && musicInfo) {
    const currentId = musicInfo.id
    playIndex = list.findIndex(m => m.id == currentId)
    if (!isTempPlay) {
      if (playIndex < 0) {
        playerPlayIndex = playerPlayIndex < 1 ? (list.length - 1) : (playerPlayIndex - 1)
      } else {
        playerPlayIndex = playIndex
      }
    }
  }

  return {
    playIndex,
    playerPlayIndex,
  }
}

export const resetPlayerMusicInfo = () => {
  setMusicInfo({
    id: null,
    pic: null,
    lrc: null,
    tlrc: null,
    rlrc: null,
    lxlrc: null,
    rawlrc: null,
    name: '',
    singer: '',
    album: '',
  })
}

const setPlayerMusicInfo = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem | null) => {
  if (musicInfo) {
    setMusicInfo('progress' in musicInfo ? {
      id: musicInfo.id,
      pic: musicInfo.metadata.musicInfo.meta.picUrl,
      name: musicInfo.metadata.musicInfo.name,
      singer: musicInfo.metadata.musicInfo.singer,
      album: musicInfo.metadata.musicInfo.meta.albumName ?? '',
      lrc: null,
      tlrc: null,
      rlrc: null,
      lxlrc: null,
      rawlrc: null,
    } : {
      id: musicInfo.id,
      pic: musicInfo.meta.picUrl,
      name: musicInfo.name,
      singer: musicInfo.singer,
      album: musicInfo.meta.albumName ?? '',
      lrc: null,
      tlrc: null,
      rlrc: null,
      lxlrc: null,
      rawlrc: null,
    })
  } else resetPlayerMusicInfo()
}

/**
 * 设置当前播放歌曲的信息
 * @param listId 歌曲所属的列表id
 * @param musicInfo 歌曲信息
 * @param isTempPlay 是否临时播放
 */
export const setPlayMusicInfo = (listId: string | null, musicInfo: LX.Download.ListItem | LX.Music.MusicInfo | null, isTempPlay: boolean = false) => {
  playerActions.setPlayMusicInfo(listId, musicInfo, isTempPlay)
  setPlayerMusicInfo(musicInfo)
  initPlayQualityInfoForTrack(musicInfo)

  setProgress(0, 0)

  if (musicInfo == null) {
    playerActions.updatePlayIndex(-1, -1)
    setPlayListId(null)
  } else {
    const { playIndex, playerPlayIndex } = getPlayIndex(listId, musicInfo, isTempPlay)

    playerActions.updatePlayIndex(playIndex, playerPlayIndex)
    global.app_event.musicToggled()
  }
}

export const getList = (listId: string | null): LX.Music.MusicInfo[] | LX.Download.ListItem[] => {
  // return listId == LIST_ID_DOWNLOAD ? downloadList : getListMusicSync(listId)
  return listId == LIST_IDS.DOWNLOAD ? [] : getListMusicSync(listId)
}
