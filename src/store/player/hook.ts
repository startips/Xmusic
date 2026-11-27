import { useEffect, useState, useSyncExternalStore } from 'react'
import { isActive } from '@/utils/tools'
import state, { type InitState } from './state'

const subscribePlayerMusicInfo = (onStoreChange: () => void) => {
  global.state_event.on('playerMusicInfoChanged', onStoreChange)
  return () => {
    global.state_event.off('playerMusicInfoChanged', onStoreChange)
  }
}
const getPlayerMusicInfoSnapshot = () => state.musicInfo
export const usePlayerMusicInfo = () =>
  useSyncExternalStore(subscribePlayerMusicInfo, getPlayerMusicInfoSnapshot)

const subscribeLyricStatus = (onStoreChange: () => void) => {
  global.state_event.on('lyricStatusChanged', onStoreChange)
  return () => {
    global.state_event.off('lyricStatusChanged', onStoreChange)
  }
}
const getLyricStatusSnapshot = () => state.lyricStatus
export const useLyricStatus = () =>
  useSyncExternalStore(subscribeLyricStatus, getLyricStatusSnapshot)

const subscribePlayQualityInfo = (onStoreChange: () => void) => {
  global.state_event.on('playQualityInfoChanged', onStoreChange)
  return () => {
    global.state_event.off('playQualityInfoChanged', onStoreChange)
  }
}
const getPlayQualityInfoSnapshot = () => state.playQualityInfo
export const usePlayQualityInfo = () =>
  useSyncExternalStore(subscribePlayQualityInfo, getPlayQualityInfoSnapshot)

const subscribePlayMusicInfo = (onStoreChange: () => void) => {
  global.state_event.on('playMusicInfoChanged', onStoreChange)
  return () => {
    global.state_event.off('playMusicInfoChanged', onStoreChange)
  }
}
const getPlayMusicInfoSnapshot = () => state.playMusicInfo
export const usePlayMusicInfo = () =>
  useSyncExternalStore(subscribePlayMusicInfo, getPlayMusicInfoSnapshot)

const subscribePlayInfo = (onStoreChange: () => void) => {
  global.state_event.on('playInfoChanged', onStoreChange)
  return () => {
    global.state_event.off('playInfoChanged', onStoreChange)
  }
}
const getPlayInfoSnapshot = () => state.playInfo
export const usePlayInfo = () =>
  useSyncExternalStore(subscribePlayInfo, getPlayInfoSnapshot)

const subscribeStatusText = (onStoreChange: () => void) => {
  global.state_event.on('playStateTextChanged', onStoreChange)
  return () => {
    global.state_event.off('playStateTextChanged', onStoreChange)
  }
}
const getStatusTextSnapshot = () => state.statusText
export const useStatusText = () =>
  useSyncExternalStore(subscribeStatusText, getStatusTextSnapshot)

const subscribeIsPlay = (onStoreChange: () => void) => {
  global.state_event.on('playStateChanged', onStoreChange)
  return () => {
    global.state_event.off('playStateChanged', onStoreChange)
  }
}
const getIsPlaySnapshot = () => state.isPlay
export const useIsPlay = () =>
  useSyncExternalStore(subscribeIsPlay, getIsPlaySnapshot)

export const useProgress = (autoUpdate = true) => {
  const [value, update] = useState(state.progress)

  useEffect(() => {
    if (!autoUpdate) return
    const handleUpdate = (progress: InitState['progress']) => {
      if (isActive()) update(progress)
    }
    update(state.progress)
    global.state_event.on('playProgressChanged', handleUpdate)
    return () => {
      global.state_event.off('playProgressChanged', handleUpdate)
    }
  }, [autoUpdate])

  return value
}

const subscribeTempPlayList = (onStoreChange: () => void) => {
  global.state_event.on('playTempPlayListChanged', onStoreChange)
  return () => {
    global.state_event.off('playTempPlayListChanged', onStoreChange)
  }
}
const getTempPlayListSnapshot = () => state.tempPlayList
export const useTempPlayList = () =>
  useSyncExternalStore(subscribeTempPlayList, getTempPlayListSnapshot)
