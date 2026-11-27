import BackgroundTimer from 'react-native-background-timer'
import nativePlayer, { PlayerState } from './nativePlayer'
import settingState from '@/store/setting/state'
import playerState from '@/store/player/state'
import { syncCurrentTrackFavoriteNotification } from '@/core/player/favoriteSync'

const defaultUserAgent = 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Mobile Safari/537.36'
const httpRxp = /^(https?:\/\/.+|\/.+)/
const remoteHttpRxp = /^https?:\/\//i

export const state = {
  isPlaying: false,
  prevDuration: -1,
  prevTrackId: '',
}

const formatMusicInfo = (musicInfo: LX.Player.PlayMusic) => {
  return 'progress' in musicInfo ? {
    id: musicInfo.id,
    pic: musicInfo.metadata.musicInfo.meta.picUrl,
    name: musicInfo.metadata.musicInfo.name,
    singer: musicInfo.metadata.musicInfo.singer,
    album: musicInfo.metadata.musicInfo.meta.albumName,
  } : {
    id: musicInfo.id,
    pic: musicInfo.meta.picUrl,
    name: musicInfo.name,
    singer: musicInfo.singer,
    album: musicInfo.meta.albumName,
  }
}

const getCurrentFullLyric = (targetId: string | null) => {
  return (settingState.setting['player.isShowBluetoothFullLyric'] && targetId &&
      playerState.musicInfo.id == targetId && playerState.musicInfo.lrc)
    ? playerState.musicInfo.lrc
    : undefined
}

export const buildTrackCacheKey = (musicInfo: LX.Player.PlayMusic, url?: string): string | undefined => {
  if (url != null && !remoteHttpRxp.test(url)) return undefined
  const mInfo = formatMusicInfo(musicInfo)
  return `${mInfo.id}_${settingState.setting['player.playQuality']}`
}

const buildTrack = (musicInfo: LX.Player.PlayMusic, url: string, duration?: number): LX.Player.Track => {
  const mInfo = formatMusicInfo(musicInfo)
  const isShowNotificationImage = settingState.setting['player.isShowNotificationImage']
  const album = mInfo.album || undefined
  const artwork = isShowNotificationImage && mInfo.pic && httpRxp.test(mInfo.pic) ? mInfo.pic : undefined
  const lyric = getCurrentFullLyric(mInfo.id)
  const cacheKey = buildTrackCacheKey(musicInfo, url)
  return {
    id: `${mInfo.id}__//${Math.random()}__//${url}`,
    url,
    title: mInfo.name || 'Unknow',
    artist: mInfo.singer || 'Unknow',
    album,
    artwork,
    userAgent: defaultUserAgent,
    musicId: mInfo.id,
    cacheKey,
    lyric,
    duration,
  }
}

export const prefetchTrackAudio = async(musicInfo: LX.Player.PlayMusic, url: string, maxBytes = 4 * 1024 * 1024): Promise<void> => {
  if (!remoteHttpRxp.test(url)) return
  const track = buildTrack(musicInfo, url)
  await nativePlayer.prefetchTrack(track, maxBytes)
}

export const updateMetaData = async(musicInfo: LX.Player.MusicInfo, isPlay: boolean, force = false) => {
  const trackId = global.lx.playerTrackId
  if (!force && isPlay == state.isPlaying && trackId == state.prevTrackId) {
    const duration = await nativePlayer.getDuration()
    if (state.prevDuration != duration) {
      state.prevDuration = duration
      if (trackId && musicInfo) {
        delayUpdateMusicInfo(musicInfo)
      }
    }
  } else {
    state.prevTrackId = trackId
    state.prevDuration = await nativePlayer.getDuration()
    if (trackId && musicInfo) {
      delayUpdateMusicInfo(musicInfo)
    }
  }
}

export const initTrackInfo = async(_musicInfo: LX.Player.PlayMusic, mInfo: LX.Player.MusicInfo) => {
  global.lx.playerTrackId = ''
  state.isPlaying = false
  state.prevDuration = -1
  state.prevTrackId = ''
  delayUpdateMusicInfo(mInfo)
}

const handlePlayMusic = async(musicInfo: LX.Player.PlayMusic, url: string, time: number) => {
  const track = buildTrack(musicInfo, url)
  state.isPlaying = false
  state.prevDuration = -1
  state.prevTrackId = ''
  global.lx.playerTrackId = track.id ?? ''
  const autoPlay = !global.lx.restorePlayInfo
  if (global.lx.restorePlayInfo) {
    global.lx.restorePlayInfo = null
  }
  await nativePlayer.loadTrack(track, time || 0, autoPlay)
}

let playPromise = Promise.resolve()
let actionId = Math.random()
export const playMusic = (musicInfo: LX.Player.PlayMusic, url: string, time: number) => {
  const id = actionId = Math.random()
  void playPromise.finally(() => {
    if (id != actionId) return
    playPromise = handlePlayMusic(musicInfo, url, time)
  })
}

let prevArtwork: string | undefined
const updateMetaInfo = async(mInfo: LX.Player.MusicInfo) => {
  const isShowNotificationImage = settingState.setting['player.isShowNotificationImage']
  state.isPlaying = await nativePlayer.getState() == PlayerState.Playing
  const artwork = isShowNotificationImage ? mInfo.pic ?? prevArtwork : undefined
  if (mInfo.pic) prevArtwork = mInfo.pic
  let title: string
  let artist: string
  if (playerState.lastLyric == null) {
    title = mInfo.name ?? 'Unknow'
    artist = mInfo.singer ?? 'Unknow'
  } else {
    title = playerState.lastLyric
    artist = `${mInfo.name}${mInfo.singer ? ` - ${mInfo.singer}` : ''}`
  }
  await syncCurrentTrackFavoriteNotification()
  await nativePlayer.updateNowPlayingMetadata({
    title,
    artist,
    album: mInfo.album ?? undefined,
    artwork: artwork ?? undefined,
    duration: state.prevDuration > 0 ? state.prevDuration : 0,
    lyric: getCurrentFullLyric(mInfo.id),
  }, state.isPlaying)
}

// 解决快速切歌导致的通知栏歌曲信息与当前播放歌曲对不上的问题
const debounceUpdateMetaInfoTools = {
  updateMetaPromise: Promise.resolve(),
  musicInfo: null as LX.Player.MusicInfo | null,
  debounce(fn: (musicInfo: LX.Player.MusicInfo) => void | Promise<void>) {
    let isDelayRun = false
    let timer: number | null = null
    let _musicInfo: LX.Player.MusicInfo | null = null
    return (musicInfo: LX.Player.MusicInfo) => {
      if (timer) {
        BackgroundTimer.clearTimeout(timer)
        timer = null
      }
      if (isDelayRun) {
        _musicInfo = musicInfo
        timer = BackgroundTimer.setTimeout(() => {
          timer = null
          const info = _musicInfo
          _musicInfo = null
          if (!info) return
          void fn(info)
        }, 500)
      } else {
        isDelayRun = true
        void fn(musicInfo)
        BackgroundTimer.setTimeout(() => {
          isDelayRun = false
        }, 500)
      }
    }
  },
  init() {
    return this.debounce(async(musicInfo: LX.Player.MusicInfo) => {
      this.musicInfo = musicInfo
      return this.updateMetaPromise.then(() => {
        if (this.musicInfo?.id === musicInfo.id) {
          this.updateMetaPromise = updateMetaInfo(musicInfo)
        }
      })
    })
  },
}

export const delayUpdateMusicInfo = debounceUpdateMetaInfoTools.init()
