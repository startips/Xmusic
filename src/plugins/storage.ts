import { NativeModules } from 'react-native'
import { log } from '@/utils/log'

interface NativeXmusicStorageSpec {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
  getAllKeys: () => Promise<string[]>
  multiGet: (keys: readonly string[]) => Promise<Array<[string, string | null]>>
  multiSet: (kvPairs: Array<[string, string]>) => Promise<void>
  multiRemove: (keys: string[]) => Promise<void>
  clear: () => Promise<void>
  getPlaylistTracks: (listId: string) => Promise<string>
  overwritePlaylistTracks: (listId: string, tracksJsonArray: string) => Promise<void>
  addPlaylistTracks: (listId: string, tracksJsonArray: string, atTop: boolean) => Promise<void>
  removePlaylistTracks: (listId: string, trackIds: string[]) => Promise<void>
  updatePlaylistTracks: (updatesJsonArray: string) => Promise<void>
  reorderPlaylistTracks: (listId: string, orderedTrackIds: string[]) => Promise<void>
  clearPlaylistTracks: (listIds: string[]) => Promise<void>
}

const nativeStorage = NativeModules.XmusicStorageModule as NativeXmusicStorageSpec

export const saveData = async(key: string, value: any) => {
  try {
    await nativeStorage.setItem(key, JSON.stringify(value))
  } catch (e: any) {
    log.error('storage error[saveData]:', key, e.message)
    throw e
  }
}

export const getData = async<T = unknown>(key: string): Promise<T | null> => {
  let value: string | null
  try {
    value = await nativeStorage.getItem(key)
  } catch (e: any) {
    log.error('storage error[getData]:', key, e.message)
    throw e
  }
  if (value == null) return null
  return JSON.parse(value) as T
}

export const removeData = async(key: string) => {
  try {
    await nativeStorage.removeItem(key)
  } catch (e: any) {
    log.error('storage error[removeData]:', key, e.message)
    throw e
  }
}

export const getAllKeys = async() => {
  try {
    return await nativeStorage.getAllKeys()
  } catch (e: any) {
    log.error('storage error[getAllKeys]:', e.message)
    throw e
  }
}

export const getDataMultiple = async<T extends readonly string[]>(keys: T) => {
  if (!keys.length) return [] as unknown as { [K in keyof T]: [T[K], unknown] }
  let datas: Array<[string, string | null]>
  try {
    datas = await nativeStorage.multiGet(keys)
  } catch (e: any) {
    log.error('storage error[getDataMultiple]:', e.message)
    throw e
  }
  return datas.map(([key, value]) => [
    key,
    value ? JSON.parse(value) : value,
  ]) as { [K in keyof T]: [T[K], unknown] }
}

export const saveDataMultiple = async(datas: Array<[string, any]>) => {
  if (!datas.length) return
  const serialized: Array<[string, string]> = datas.map(([key, value]) => [key, JSON.stringify(value)])
  try {
    await nativeStorage.multiSet(serialized)
  } catch (e: any) {
    log.error('storage error[saveDataMultiple]:', e.message)
    throw e
  }
}

export const removeDataMultiple = async(keys: string[]) => {
  if (!keys.length) return
  try {
    await nativeStorage.multiRemove(keys)
  } catch (e: any) {
    log.error('storage error[removeDataMultiple]:', e.message)
    throw e
  }
}

export const clearAll = async() => {
  try {
    await nativeStorage.clear()
  } catch (e: any) {
    log.error('storage error[clearAll]:', e.message)
    throw e
  }
}

// ---- Relational Playlist Table APIs (O(k) mutations) ----

export const getPlaylistTracks = async<T = LX.Music.MusicInfo>(listId: string): Promise<T[]> => {
  try {
    const raw = await nativeStorage.getPlaylistTracks(listId)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch (e: any) {
    log.error('storage error[getPlaylistTracks]:', listId, e.message)
    throw e
  }
}

export const overwritePlaylistTracks = async(listId: string, tracks: LX.Music.MusicInfo[]) => {
  try {
    await nativeStorage.overwritePlaylistTracks(listId, JSON.stringify(tracks))
  } catch (e: any) {
    log.error('storage error[overwritePlaylistTracks]:', listId, e.message)
    throw e
  }
}

export const addPlaylistTracks = async(listId: string, tracks: LX.Music.MusicInfo[], atTop: boolean) => {
  if (!tracks.length) return
  try {
    await nativeStorage.addPlaylistTracks(listId, JSON.stringify(tracks), atTop)
  } catch (e: any) {
    log.error('storage error[addPlaylistTracks]:', listId, e.message)
    throw e
  }
}

export const removePlaylistTracks = async(listId: string, trackIds: string[]) => {
  if (!trackIds.length) return
  try {
    await nativeStorage.removePlaylistTracks(listId, trackIds)
  } catch (e: any) {
    log.error('storage error[removePlaylistTracks]:', listId, e.message)
    throw e
  }
}

export const updatePlaylistTracks = async(updates: Array<{ id: string, musicInfo: LX.Music.MusicInfo }>) => {
  if (!updates.length) return
  try {
    await nativeStorage.updatePlaylistTracks(JSON.stringify(updates))
  } catch (e: any) {
    log.error('storage error[updatePlaylistTracks]:', e.message)
    throw e
  }
}

export const reorderPlaylistTracks = async(listId: string, orderedTrackIds: string[]) => {
  if (!orderedTrackIds.length) return
  try {
    await nativeStorage.reorderPlaylistTracks(listId, orderedTrackIds)
  } catch (e: any) {
    log.error('storage error[reorderPlaylistTracks]:', listId, e.message)
    throw e
  }
}

export const clearPlaylistTracks = async(listIds: string[]) => {
  if (!listIds.length) return
  try {
    await nativeStorage.clearPlaylistTracks(listIds)
  } catch (e: any) {
    log.error('storage error[clearPlaylistTracks]:', e.message)
    throw e
  }
}
