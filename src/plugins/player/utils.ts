import BackgroundTimer from 'react-native-background-timer'
import nativePlayer, { addPlayerEventListener, PlayerEvent, PlayerState } from './nativePlayer'
import { playMusic as handlePlayMusic } from './playList'
import { existsFile, moveFile, privateStorageDirectoryPath, temporaryDirectoryPath } from '@/utils/fs'
import { toast } from '@/utils/tools'

export { useBufferProgress } from './hook'

const emptyIdRxp = /\/\/default$/
const tempIdRxp = /\/\/default$|\/\/default\/\/restorePlay$/
export const isEmpty = (trackId = global.lx.playerTrackId) => {
  return !trackId || emptyIdRxp.test(trackId)
}
export const isTempId = (trackId = global.lx.playerTrackId) => !trackId || tempIdRxp.test(trackId)

const playMusic = ((fn: (musicInfo: LX.Player.PlayMusic, url: string, time: number) => void, delay = 800) => {
  let delayTimer: number | null = null
  let isDelayRun = false
  let timer: number | null = null
  let _musicInfo: LX.Player.PlayMusic | null = null
  let _url = ''
  let _time = 0
  return (musicInfo: LX.Player.PlayMusic, url: string, time: number) => {
    _musicInfo = musicInfo
    _url = url
    _time = time
    if (timer) {
      BackgroundTimer.clearTimeout(timer)
      timer = null
    }
    if (isDelayRun) {
      if (delayTimer) {
        BackgroundTimer.clearTimeout(delayTimer)
        delayTimer = null
      }
      timer = BackgroundTimer.setTimeout(() => {
        timer = null
        const musicInfo = _musicInfo
        const url = _url
        const time = _time
        _musicInfo = null
        _url = ''
        _time = 0
        isDelayRun = false
        fn(musicInfo!, url, time)
      }, delay)
    } else {
      isDelayRun = true
      fn(musicInfo, url, time)
      delayTimer = BackgroundTimer.setTimeout(() => {
        delayTimer = null
        isDelayRun = false
      }, 500)
    }
  }
})((musicInfo, url, time) => {
  handlePlayMusic(musicInfo, url, time)
})

export const setResource = (musicInfo: LX.Player.PlayMusic, url: string, duration?: number) => {
  playMusic(musicInfo, url, duration ?? 0)
}

export const setPlay = async() => nativePlayer.play()
export const getPosition = async() => nativePlayer.getPosition()
export const getDuration = async() => nativePlayer.getDuration()
export const setStop = async() => {
  global.lx.playerTrackId = ''
  await nativePlayer.stop()
}

export const setPause = async() => nativePlayer.pause()
export const setCurrentTime = async(time: number) => nativePlayer.seekTo(time)
export const setVolume = async(num: number) => nativePlayer.setVolume(num)
export const setPlaybackRate = async(num: number) => nativePlayer.setRate(num)
export interface NowPlayingTitles {
  title?: string
  artist?: string
  album?: string
  lyric?: string
}
export const updateNowPlayingTitles = async(titles: NowPlayingTitles) => {
  if (!global.lx.playerStatus.isInitialized) return
  return nativePlayer.updateNowPlayingTitles(titles)
}

export const resetPlay = async() => Promise.all([setPause(), setCurrentTime(0)])

export const isCached = async(url: string) => nativePlayer.isCached(url)
export const getCacheSize = async() => nativePlayer.getCacheSize()
export const clearCache = async() => nativePlayer.clearCache()
export const migratePlayerCache = async() => {
  const newCachePath = privateStorageDirectoryPath + '/TrackPlayer'
  if (await existsFile(newCachePath)) return
  const oldCachePath = temporaryDirectoryPath + '/TrackPlayer'
  if (!await existsFile(oldCachePath)) return
  let timeout: number | null = BackgroundTimer.setTimeout(() => {
    timeout = null
    toast(global.i18n.t('player_cache_migrating'), 'long')
  }, 2_000)
  await moveFile(oldCachePath, newCachePath).finally(() => {
    if (timeout) BackgroundTimer.clearTimeout(timeout)
  })
}

export const destroy = async() => {
  if (global.lx.playerStatus.isIniting || !global.lx.playerStatus.isInitialized) return
  await nativePlayer.destroy()
  global.lx.playerStatus.isInitialized = false
}

type PlayStatus = 'None' | 'Ready' | 'Playing' | 'Paused' | 'Stopped' | 'Buffering' | 'Connecting'

export const onStateChange = async(listener: (state: PlayStatus) => void) => {
  const sub = addPlayerEventListener<{ state: PlayerState }>(PlayerEvent.PlaybackState, ({ state }) => {
    let _state: PlayStatus
    switch (state) {
      case PlayerState.Playing:
        _state = 'Playing'
        break
      case PlayerState.Paused:
        _state = 'Paused'
        break
      case PlayerState.Stopped:
        _state = 'Stopped'
        break
      case PlayerState.Buffering:
        _state = 'Buffering'
        break
      case PlayerState.Connecting:
        _state = 'Connecting'
        break
      case PlayerState.None:
      default:
        _state = 'None'
        break
    }
    listener(_state)
  })

  return () => {
    sub.remove()
  }
}

export const setFavoriteNotificationState = (isFavorite: boolean) => {
  void nativePlayer.setFavoriteState(isFavorite)
}

export const updateOptions = async(options = {
  stopWithApp: true,
}) => {
  return nativePlayer.updateOptions(options)
}

export { updateMetaData, initTrackInfo } from './playList'
