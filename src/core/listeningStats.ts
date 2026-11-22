import { useCallback, useEffect, useState } from 'react'
import BackgroundTimer from 'react-native-background-timer'

import { createList, overwriteListMusics, setActiveList } from '@/core/list'
import { resolveCurrentPlayMusicInfo } from '@/core/player/favoriteSync'
import { playList } from '@/core/player/player'
import { getData, saveData } from '@/plugins/storage'
import listState from '@/store/list/state'
import playerState from '@/store/player/state'
import { throttle } from '@/utils/common'

const STORAGE_KEY = '@xmusic_listening_stats_v1'
export const SMART_TOP50_LIST_ID = 'userlist_xmusic_top50'
const MAX_STORED_TRACKS = 300
const MAX_STORED_DAYS = 35

export interface TrackListenEntry {
  musicInfo: LX.Music.MusicInfo
  count: number
  seconds: number
  lastPlayedAt: number
}

interface PersistedListeningStats {
  totalSeconds: number
  totalPlays: number
  dailySeconds: Record<string, number>
  tracks: Record<string, TrackListenEntry>
}

export interface ArtistStatItem {
  singer: string
  plays: number
  seconds: number
}

export interface ListeningStatsSnapshot {
  totalSeconds: number
  totalPlays: number
  todaySeconds: number
  weekSeconds: number
  topArtists: ArtistStatItem[]
  topTracks: TrackListenEntry[]
}

const memStats: PersistedListeningStats = {
  totalSeconds: 0,
  totalPlays: 0,
  dailySeconds: {},
  tracks: {},
}

let loaded = false
const listeners = new Set<() => void>()

const notifyListeners = () => {
  for (const fn of listeners) fn()
}

const getDateKey = (date = new Date()): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const pruneStatsInPlace = () => {
  const dayKeys = Object.keys(memStats.dailySeconds).sort()
  if (dayKeys.length > MAX_STORED_DAYS) {
    const removeCount = dayKeys.length - MAX_STORED_DAYS
    for (let i = 0; i < removeCount; i++) {
      delete memStats.dailySeconds[dayKeys[i]]
    }
  }

  const entries = Object.entries(memStats.tracks)
  if (entries.length > MAX_STORED_TRACKS) {
    entries.sort((a, b) => {
      const scoreA = a[1].count * 120 + a[1].seconds + a[1].lastPlayedAt / 1e11
      const scoreB = b[1].count * 120 + b[1].seconds + b[1].lastPlayedAt / 1e11
      return scoreB - scoreA
    })
    const nextTracks: Record<string, TrackListenEntry> = {}
    for (let i = 0; i < MAX_STORED_TRACKS; i++) {
      const [id, entry] = entries[i]
      nextTracks[id] = entry
    }
    memStats.tracks = nextTracks
  }
}

const persistStatsThrottled = throttle(() => {
  pruneStatsInPlace()
  void saveData(STORAGE_KEY, memStats)
}, 3000)

export const buildListeningStatsSnapshot = (): ListeningStatsSnapshot => {
  const todayKey = getDateKey()
  const todaySeconds = memStats.dailySeconds[todayKey] ?? 0

  let weekSeconds = 0
  const now = Date.now()
  for (let i = 0; i < 7; i++) {
    const k = getDateKey(new Date(now - i * 86_400_000))
    weekSeconds += memStats.dailySeconds[k] ?? 0
  }

  const trackEntries = Object.values(memStats.tracks).sort((a, b) => {
    const scoreA = a.count * 120 + a.seconds
    const scoreB = b.count * 120 + b.seconds
    if (scoreB !== scoreA) return scoreB - scoreA
    return b.lastPlayedAt - a.lastPlayedAt
  })

  const artistMap = new Map<string, ArtistStatItem>()
  for (const item of trackEntries) {
    const rawSinger = item.musicInfo.singer?.trim()
    if (!rawSinger) continue
    const singers = rawSinger.split(/[、/,&]/).map(s => s.trim()).filter(Boolean)
    const primarySinger = singers[0] ?? rawSinger
    const prev = artistMap.get(primarySinger)
    if (prev) {
      prev.plays += Math.max(1, item.count)
      prev.seconds += item.seconds
    } else {
      artistMap.set(primarySinger, {
        singer: primarySinger,
        plays: Math.max(1, item.count),
        seconds: item.seconds,
      })
    }
  }

  const topArtists = Array.from(artistMap.values())
    .sort((a, b) => (b.plays * 90 + b.seconds) - (a.plays * 90 + a.seconds))
    .slice(0, 6)

  return {
    totalSeconds: memStats.totalSeconds,
    totalPlays: memStats.totalPlays,
    todaySeconds,
    weekSeconds,
    topArtists,
    topTracks: trackEntries.slice(0, 50),
  }
}

export const useListeningStatsSnapshot = (): [ListeningStatsSnapshot, () => void] => {
  const [snap, setSnap] = useState<ListeningStatsSnapshot>(() => buildListeningStatsSnapshot())

  const refresh = useCallback(() => {
    setSnap(buildListeningStatsSnapshot())
  }, [])

  useEffect(() => {
    refresh()
    listeners.add(refresh)
    return () => {
      listeners.delete(refresh)
    }
  }, [refresh])

  return [snap, refresh]
}

export const syncTop50SmartPlaylist = async(listName: string): Promise<{ listId: string, count: number }> => {
  const snap = buildListeningStatsSnapshot()
  const musics = snap.topTracks.map(t => t.musicInfo)
  if (!musics.length) return { listId: SMART_TOP50_LIST_ID, count: 0 }

  const exists = listState.userList.some(l => l.id === SMART_TOP50_LIST_ID)
  if (!exists) {
    await createList({
      id: SMART_TOP50_LIST_ID,
      name: listName,
      list: musics,
      position: 0,
    })
  } else {
    await overwriteListMusics(SMART_TOP50_LIST_ID, musics)
  }
  setActiveList(SMART_TOP50_LIST_ID)
  return { listId: SMART_TOP50_LIST_ID, count: musics.length }
}

export const playTop50SmartPlaylist = async(listName: string, index = 0): Promise<boolean> => {
  const res = await syncTop50SmartPlaylist(listName)
  if (res.count <= 0) return false
  await playList(res.listId, Math.max(0, Math.min(index, res.count - 1)))
  return true
}

export const initListeningStats = async() => {
  if (loaded) return
  loaded = true
  try {
    const saved = await getData<Partial<PersistedListeningStats>>(STORAGE_KEY)
    if (saved && typeof saved === 'object') {
      memStats.totalSeconds = Number(saved.totalSeconds) || 0
      memStats.totalPlays = Number(saved.totalPlays) || 0
      memStats.dailySeconds = saved.dailySeconds && typeof saved.dailySeconds === 'object' ? saved.dailySeconds : {}
      memStats.tracks = saved.tracks && typeof saved.tracks === 'object' ? saved.tracks : {}
    }
  } catch {}

  let sessionTrackId: string | null = null
  let sessionAccumSec = 0
  let sessionCountedPlay = false
  let tickerId: number | null = null

  const ensureTrackEntry = (musicInfo: LX.Music.MusicInfo): TrackListenEntry => {
    const existing = memStats.tracks[musicInfo.id]
    if (existing) {
      existing.musicInfo = musicInfo
      existing.lastPlayedAt = Date.now()
      return existing
    }
    const created: TrackListenEntry = {
      musicInfo,
      count: 0,
      seconds: 0,
      lastPlayedAt: Date.now(),
    }
    memStats.tracks[musicInfo.id] = created
    return created
  }

  const stopTicker = () => {
    if (tickerId != null) {
      BackgroundTimer.clearInterval(tickerId)
      tickerId = null
    }
  }

  const tickSecond = () => {
    if (!playerState.isPlay) {
      stopTicker()
      return
    }
    const current = resolveCurrentPlayMusicInfo()
    if (!current) return

    if (sessionTrackId !== current.id) {
      sessionTrackId = current.id
      sessionAccumSec = 0
      sessionCountedPlay = false
    }

    sessionAccumSec += 1
    memStats.totalSeconds += 1
    const today = getDateKey()
    memStats.dailySeconds[today] = (memStats.dailySeconds[today] ?? 0) + 1

    const entry = ensureTrackEntry(current)
    entry.seconds += 1

    if (!sessionCountedPlay && sessionAccumSec >= 15) {
      sessionCountedPlay = true
      entry.count += 1
      memStats.totalPlays += 1
      notifyListeners()
    }

    persistStatsThrottled()
  }

  const startTicker = () => {
    stopTicker()
    tickerId = BackgroundTimer.setInterval(tickSecond, 1000)
  }

  global.app_event.on('play', startTicker)
  global.app_event.on('pause', stopTicker)
  global.app_event.on('stop', stopTicker)
  global.app_event.on('error', stopTicker)
  global.app_event.on('playerEnded', () => {
    const current = resolveCurrentPlayMusicInfo()
    if (current && !sessionCountedPlay && sessionAccumSec >= 5) {
      sessionCountedPlay = true
      const entry = ensureTrackEntry(current)
      entry.count += 1
      memStats.totalPlays += 1
      persistStatsThrottled()
      notifyListeners()
    }
  })
  global.state_event.on('playMusicInfoChanged', () => {
    const current = resolveCurrentPlayMusicInfo()
    if (current?.id !== sessionTrackId) {
      sessionTrackId = current?.id ?? null
      sessionAccumSec = 0
      sessionCountedPlay = false
    }
  })

  if (playerState.isPlay) startTicker()
}
