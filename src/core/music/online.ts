import {
  saveLyric,
  saveMusicUrl,
  getMusicUrl as getStoreMusicUrl,
} from '@/utils/data'
import { updateListMusics } from '@/core/list'
import settingState from '@/store/setting/state'

import {
  buildLyricInfo,
  getPlayQuality,
  handleGetOnlineLyricInfo,
  handleGetOnlineMusicUrl,
  handleGetOnlinePicUrl,
  getCachedLyricInfo,
} from './utils'

/* export const setMusicUrl = ({ musicInfo, type, url }: {
  musicInfo: LX.Music.MusicInfo
  type: LX.Quality
  url: string
}) => {
  saveMusicUrl(musicInfo, type, url)
}

export const setPic = (datas: {
  listId: string
  musicInfo: LX.Music.MusicInfo
  url: string
}) => {
  datas.musicInfo.img = datas.url
  updateMusicInfo({
    listId: datas.listId,
    id: datas.musicInfo.songmid,
    data: { img: datas.url },
    musicInfo: datas.musicInfo,
  })
}
 */


export interface ResolvedMusicQualityMeta {
  requestedQuality: LX.Quality
  actualQuality: LX.Quality
  actualSource: LX.OnlineSource
}

const inFlightMusicUrlPromises = new Map<string, Promise<string>>()
const resolvedQualityMetaCache = new Map<string, { actualQuality: LX.Quality, actualSource: LX.OnlineSource }>()

const rememberResolvedQuality = (key: string, actualQuality: LX.Quality, actualSource: LX.OnlineSource) => {
  if (resolvedQualityMetaCache.size > 200) {
    const oldestKey = resolvedQualityMetaCache.keys().next().value
    if (oldestKey) resolvedQualityMetaCache.delete(oldestKey)
  }
  resolvedQualityMetaCache.set(key, { actualQuality, actualSource })
}

export const getMusicUrl = async({ musicInfo, quality, isRefresh, allowToggleSource = true, onToggleSource = () => {}, onResolvedQuality }: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  onResolvedQuality?: (meta: ResolvedMusicQualityMeta) => void
}): Promise<string> => {
  const requestedQuality = quality ?? getPlayQuality(settingState.setting['player.playQuality'], musicInfo)
  const metaKey = `${musicInfo.id}_${requestedQuality}`
  const dedupKey = `${metaKey}_${allowToggleSource ? '1' : '0'}`
  if (!isRefresh) {
    const cachedUrl = await getStoreMusicUrl(musicInfo, requestedQuality)
    if (cachedUrl) {
      const cachedMeta = resolvedQualityMetaCache.get(metaKey)
      onResolvedQuality?.({
        requestedQuality,
        actualQuality: cachedMeta?.actualQuality ?? requestedQuality,
        actualSource: cachedMeta?.actualSource ?? musicInfo.source,
      })
      return cachedUrl
    }
    const inFlight = inFlightMusicUrlPromises.get(dedupKey)
    if (inFlight) {
      return inFlight.then((url) => {
        const cachedMeta = resolvedQualityMetaCache.get(metaKey)
        onResolvedQuality?.({
          requestedQuality,
          actualQuality: cachedMeta?.actualQuality ?? requestedQuality,
          actualSource: cachedMeta?.actualSource ?? musicInfo.source,
        })
        return url
      })
    }
  }

  const reqPromise = handleGetOnlineMusicUrl({ musicInfo, quality, onToggleSource, isRefresh, allowToggleSource }).then(({ url, quality: actualQuality, musicInfo: targetMusicInfo, isFromCache }) => {
    if (targetMusicInfo.id != musicInfo.id) {
      musicInfo.meta.toggleMusicInfo = targetMusicInfo
      const toggleReqQuality = quality ?? getPlayQuality(settingState.setting['player.playQuality'], targetMusicInfo)
      rememberResolvedQuality(`${targetMusicInfo.id}_${actualQuality}`, actualQuality, targetMusicInfo.source)
      rememberResolvedQuality(`${targetMusicInfo.id}_${toggleReqQuality}`, actualQuality, targetMusicInfo.source)
      if (!isFromCache) {
        void saveMusicUrl(targetMusicInfo, actualQuality, url)
        if (actualQuality != toggleReqQuality) {
          void saveMusicUrl(targetMusicInfo, toggleReqQuality, url)
        }
      }
    }
    rememberResolvedQuality(`${musicInfo.id}_${actualQuality}`, actualQuality, targetMusicInfo.source)
    rememberResolvedQuality(metaKey, actualQuality, targetMusicInfo.source)
    onResolvedQuality?.({
      requestedQuality,
      actualQuality,
      actualSource: targetMusicInfo.source,
    })
    void saveMusicUrl(musicInfo, actualQuality, url)
    if (actualQuality != requestedQuality) {
      void saveMusicUrl(musicInfo, requestedQuality, url)
    }
    return url
  }).finally(() => {
    if (inFlightMusicUrlPromises.get(dedupKey) === reqPromise) {
      inFlightMusicUrlPromises.delete(dedupKey)
    }
  })

  if (!isRefresh) {
    inFlightMusicUrlPromises.set(dedupKey, reqPromise)
  }
  return reqPromise
}

export const getPicUrl = async({ musicInfo, listId, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoOnline
  listId?: string | null
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (musicInfo.meta.picUrl && !isRefresh) return musicInfo.meta.picUrl
  return handleGetOnlinePicUrl({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(({ url, musicInfo: targetMusicInfo, isFromCache }) => {
    // picRequest = null
    if (listId) {
      musicInfo.meta.picUrl = url
      void updateListMusics([{ id: listId, musicInfo }])
    }
    // savePic({ musicInfo, url, listId })
    return url
  })
}
export const getLyricInfo = async({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Music.MusicInfoOnline
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  // lrcRequest = music[musicInfo.source].getLyric(musicInfo)
  return handleGetOnlineLyricInfo({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(async({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
    // lrcRequest = null
    if (isFromCache) return buildLyricInfo(lyricInfo)
    if (targetMusicInfo.id == musicInfo.id) void saveLyric(musicInfo, lyricInfo)
    else void saveLyric(targetMusicInfo, lyricInfo)

    return buildLyricInfo(lyricInfo)
  })
}
