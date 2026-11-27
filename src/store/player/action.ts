import { arrPush, arrUnshift, formatPlayTime2 } from '@/utils'
import state, { createDefaultPlayQualityInfo, type LyricStatus } from './state'

type PlayerMusicInfoKeys = keyof LX.Player.MusicInfo
const musicInfoKeys: PlayerMusicInfoKeys[] = Object.keys(state.musicInfo) as PlayerMusicInfoKeys[]

export default {
  updatePlayIndex(playIndex: number, playerPlayIndex: number) {
    state.playInfo = {
      ...state.playInfo,
      playIndex,
      playerPlayIndex,
    }

    global.state_event.playInfoChanged(state.playInfo)
  },
  setPlayListId(playerListId: string | null) {
    state.playInfo = {
      ...state.playInfo,
      playerListId,
    }

    global.state_event.playInfoChanged(state.playInfo)
  },
  setPlayMusicInfo(listId: string | null, musicInfo: LX.Download.ListItem | LX.Music.MusicInfo | null, isTempPlay: boolean = false) {
    state.playMusicInfo = { listId, musicInfo, isTempPlay }

    global.state_event.playMusicInfoChanged(state.playMusicInfo)
  },
  setMusicInfo(_musicInfo: Partial<LX.Player.MusicInfo>) {
    const nextMusicInfo: LX.Player.MusicInfo = { ...state.musicInfo }
    for (const key of musicInfoKeys) {
      const val = _musicInfo[key]
      if (val !== undefined) {
        // @ts-expect-error
        nextMusicInfo[key] = val
      }
    }
    state.musicInfo = nextMusicInfo

    global.state_event.playerMusicInfoChanged(state.musicInfo)
  },
  setLyricStatus(lyricStatus: LyricStatus) {
    if (state.lyricStatus === lyricStatus) return
    state.lyricStatus = lyricStatus
    global.state_event.lyricStatusChanged(lyricStatus)
  },
  setPlayQualityInfo(info: Partial<LX.Player.PlayQualityInfo>) {
    state.playQualityInfo = {
      ...state.playQualityInfo,
      ...info,
    }
    global.state_event.playQualityInfoChanged(state.playQualityInfo)
  },
  resetPlayQualityInfo() {
    state.playQualityInfo = createDefaultPlayQualityInfo()
    global.state_event.playQualityInfoChanged(state.playQualityInfo)
  },
  setIsPlay(isPlay: boolean) {
    state.isPlay = isPlay

    global.state_event.playStateChanged(isPlay)
  },
  setStatusText(statusText: string) {
    state.statusText = statusText
    global.state_event.playStateTextChanged(statusText)
  },
  setNowPlayTime(time: number) {
    state.progress = {
      ...state.progress,
      nowPlayTime: time,
      nowPlayTimeStr: formatPlayTime2(time),
      progress: state.progress.maxPlayTime ? time / state.progress.maxPlayTime : 0,
    }

    global.state_event.playProgressChanged(state.progress)
  },
  setMaxplayTime(time: number) {
    state.progress = {
      ...state.progress,
      maxPlayTime: time,
      maxPlayTimeStr: formatPlayTime2(time),
      progress: time ? state.progress.nowPlayTime / time : 0,
    }

    global.state_event.playProgressChanged(state.progress)
  },
  setProgress(currentTime: number, totalTime: number) {
    state.progress = {
      nowPlayTime: currentTime,
      nowPlayTimeStr: formatPlayTime2(currentTime),
      maxPlayTime: totalTime,
      maxPlayTimeStr: formatPlayTime2(totalTime),
      progress: totalTime ? currentTime / totalTime : 0,
    }

    global.state_event.playProgressChanged(state.progress)
  },
  setBufferProgress(progress: number) {
    const clamped = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
    if (Math.abs(clamped - state.bufferedProgress) < 0.002 && clamped !== 0 && clamped !== 1) return
    if (clamped === state.bufferedProgress) return
    state.bufferedProgress = clamped
    global.state_event.bufferProgressChanged(clamped)
  },
  addPlayedList(info: LX.Player.PlayMusicInfo) {
    if (state.playedList.some(m => m.musicInfo.id == info.musicInfo.id)) return
    const next = [...state.playedList, info]
    state.playedList = next

    global.state_event.playPlayedListChanged(state.playedList)
  },
  removePlayedList(index: number) {
    const next = [...state.playedList]
    next.splice(index, 1)
    state.playedList = next

    global.state_event.playPlayedListChanged(state.playedList)
  },
  clearPlayedList() {
    state.playedList = []

    global.state_event.playPlayedListChanged(state.playedList)
  },
  addTempPlayList(list: LX.Player.TempPlayListItem[]) {
    const topList: Array<{ listId: string | null, musicInfo: LX.Music.MusicInfo | LX.Download.ListItem }> = []
    const bottomList = list.filter(({ isTop, ...musicInfo }) => {
      if (isTop) {
        topList.push(musicInfo)
        return false
      }
      return true
    })
    const next = [...state.tempPlayList]
    if (topList.length) arrUnshift(next, topList.map(({ musicInfo, listId }) => ({ musicInfo, listId: listId ?? '', isTempPlay: true })))
    if (bottomList.length) arrPush(next, bottomList.map(({ musicInfo, listId }) => ({ musicInfo, listId: listId ?? '', isTempPlay: true })))
    state.tempPlayList = next

    global.state_event.playTempPlayListChanged(state.tempPlayList)
  },
  promoteTempPlayList(index: number) {
    if (index <= 0 || index >= state.tempPlayList.length) return
    const next = [...state.tempPlayList]
    const [item] = next.splice(index, 1)
    next.unshift(item)
    state.tempPlayList = next

    global.state_event.playTempPlayListChanged(state.tempPlayList)
  },
  removeTempPlayList(index: number) {
    const next = [...state.tempPlayList]
    next.splice(index, 1)
    state.tempPlayList = next

    global.state_event.playTempPlayListChanged(state.tempPlayList)
  },
  clearTempPlayeList() {
    state.tempPlayList = []

    global.state_event.playTempPlayListChanged(state.tempPlayList)
  },
  setLoadErrorPicUrl(url: string) {
    state.loadErrorPicUrl = url
  },
  setLastLyric(lrc?: string) {
    state.lastLyric = lrc
  },
}
