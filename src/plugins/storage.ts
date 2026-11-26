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
