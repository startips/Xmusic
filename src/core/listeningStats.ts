import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import BackgroundTimer from 'react-native-background-timer'

import { createList, overwriteListMusics, setActiveList } from '@/core/list'
import { resolveCurrentPlayMusicInfo } from '@/core/player/favoriteSync'
import { playList } from '@/core/player/player'
import { getData, saveData } from '@/plugins/storage'
import listState from '@/store/list/state'
import playerState from '@/store/player/state'

const STORAGE_KEY = '@xmusic_listening_stats_v1'
export const SMART_TOP50_LIST_ID = 'userlist_xmusic_top50'
const MAX_STORED_TRACKS = 300
const MAX_STORED_DAYS = 35
const CHECKPOINT_INTERVAL_MS = 60_000
const PERSIST_MIN_INTERVAL_MS = 60_000
const MAX_SINGLE_FLUSH_SEC = 600

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
let dirty = false
let lastPersistMs = 0
let sessionStartMs: number | null = null
let sessionTrack: LX.Music.MusicInfo | null = null
let sessionAccumSec = 0
let sessionCountedPlay = false
let checkpointTimer: number | null = null
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

const persistStats = (force = false) => {
  if (!dirty) return
  const now = Date.now()
  if (!force && now - lastPersistMs < PERSIST_MIN_INTERVAL_MS) return
  dirty = false
  lastPersistMs = now
  pruneStatsInPlace()
  void saveData(STORAGE_KEY, memStats)
}

const ensureTrackEntry = (musicInfo: LX.Music.MusicInfo, now: number): TrackListenEntry => {
  const existing = memStats.tracks[musicInfo.id]
  if (existing) {
    existing.musicInfo = musicInfo
    existing.lastPlayedAt = now
    return existing
  }
  const created: TrackListenEntry = {
    musicInfo,
    count: 0,
    seconds: 0,
    lastPlayedAt: now,
  }
  memStats.tracks[musicInfo.id] = created
  return created
}

const flushSessionElapsed = (now = Date.now(), forcePersist = false, minPlayCountSec = 15) => {
  if (sessionStartMs == null) {
    if (forcePersist) persistStats(true)
    return
  }
  const track = sessionTrack ?? resolveCurrentPlayMusicInfo()
  const rawDeltaSec = Math.floor((now - sessionStartMs) / 1000)
  if (rawDeltaSec > 0 && track) {
    const deltaSec = Math.min(rawDeltaSec, MAX_SINGLE_FLUSH_SEC)
    sessionStartMs = rawDeltaSec > MAX_SINGLE_FLUSH_SEC ? now : sessionStartMs + rawDeltaSec * 1000
    sessionAccumSec += deltaSec
    memStats.totalSeconds += deltaSec
    const today = getDateKey(new Date(now))
    memStats.dailySeconds[today] = (memStats.dailySeconds[today] ?? 0) + deltaSec
    const entry = ensureTrackEntry(track, now)
    entry.seconds += deltaSec
    dirty = true

    if (!sessionCountedPlay && sessionAccumSec >= minPlayCountSec) {
      sessionCountedPlay = true
      entry.count += 1
      memStats.totalPlays += 1
      notifyListeners()
    }
  } else if (rawDeltaSec < 0) {
    // Wall clock moved backward; resync anchor cleanly
    sessionStartMs = now
  }

  persistStats(forcePersist)
}

export const buildListeningStatsSnapshot = (): ListeningStatsSnapshot => {
  if (playerState.isPlay && sessionStartMs != null) {
    flushSessionElapsed(Date.now(), false)
  }

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
    .slice(0, 10)

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

  const stopCheckpointTimer = () => {
    if (checkpointTimer != null) {
      BackgroundTimer.clearInterval(checkpointTimer)
      checkpointTimer = null
    }
  }

  const startSession = () => {
    const now = Date.now()
    const current = resolveCurrentPlayMusicInfo()
    if (sessionStartMs != null) {
      flushSessionElapsed(now, false)
    }
    if (current && current.id !== sessionTrack?.id) {
      sessionTrack = current
      sessionAccumSec = 0
      sessionCountedPlay = false
    } else if (current) {
      sessionTrack = current
    }
    sessionStartMs = now
    stopCheckpointTimer()
    checkpointTimer = BackgroundTimer.setInterval(() => {
      if (!playerState.isPlay) {
        stopCheckpointTimer()
        return
      }
      flushSessionElapsed(Date.now(), true)
    }, CHECKPOINT_INTERVAL_MS)
  }

  const pauseSession = () => {
    flushSessionElapsed(Date.now(), true)
    sessionStartMs = null
    stopCheckpointTimer()
  }

  global.app_event.on('play', startSession)
  global.app_event.on('pause', pauseSession)
  global.app_event.on('stop', pauseSession)
  global.app_event.on('error', pauseSession)
  global.app_event.on('playerEnded', () => {
    const now = Date.now()
    flushSessionElapsed(now, false, 5)
    const current = sessionTrack ?? resolveCurrentPlayMusicInfo()
    if (current && !sessionCountedPlay && sessionAccumSec >= 5) {
      sessionCountedPlay = true
      const entry = ensureTrackEntry(current, now)
      entry.count += 1
      memStats.totalPlays += 1
      dirty = true
      notifyListeners()
    }
    sessionStartMs = null
    stopCheckpointTimer()
    persistStats(true)
  })
  global.state_event.on('playMusicInfoChanged', () => {
    const now = Date.now()
    const nextTrack = resolveCurrentPlayMusicInfo()
    if (nextTrack?.id !== sessionTrack?.id) {
      flushSessionElapsed(now, true)
      sessionTrack = nextTrack
      sessionAccumSec = 0
      sessionCountedPlay = false
      sessionStartMs = playerState.isPlay && nextTrack ? now : null
    }
  })
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') {
      flushSessionElapsed(Date.now(), true)
    }
  })

  if (playerState.isPlay) startSession()
}
