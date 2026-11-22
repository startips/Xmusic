import { useEffect, useMemo, useState } from 'react'
import playerState from '@/store/player/state'

export interface KaraokeToken {
  startMs: number
  durationMs: number
  text: string
}

export interface KaraokeLineMap {
  offsetMs: number
  byTime: Map<number, KaraokeToken[]>
  sortedTimes: number[]
}

const OFFSET_RXP = /^\[offset:\s*(-?\d+)\s*\]$/i
const LINE_TAGS_RXP = /^((?:\[\d{1,3}:\d{1,2}(?:\.\d{1,3})?\])+)(.*)$/
const SINGLE_TIME_RXP = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g
const WORD_TAG_RXP = /<(\d+),(\d+)>([^<]*)/g

const parseTimeTagToMs = (minStr: string, secStr: string, fracStr?: string): number => {
  const mins = parseInt(minStr, 10) || 0
  const secs = parseInt(secStr, 10) || 0
  let ms = 0
  if (fracStr) {
    if (fracStr.length === 1) ms = (parseInt(fracStr, 10) || 0) * 100
    else if (fracStr.length === 2) ms = (parseInt(fracStr, 10) || 0) * 10
    else ms = parseInt(fracStr.slice(0, 3), 10) || 0
  }
  return mins * 60_000 + secs * 1000 + ms
}

export const parseKaraokeLyricMap = (lxlrc: string | null | undefined): KaraokeLineMap | null => {
  if (!lxlrc?.trim()) return null

  const rawLines = lxlrc.split(/\r\n|\n|\r/)
  let offsetMs = 0
  const byTime = new Map<number, KaraokeToken[]>()

  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line) continue

    const offsetMatch = OFFSET_RXP.exec(line)
    if (offsetMatch) {
      offsetMs = parseInt(offsetMatch[1], 10) || 0
      continue
    }

    const lineMatch = LINE_TAGS_RXP.exec(line)
    if (!lineMatch) continue

    const timeHeader = lineMatch[1]
    const body = lineMatch[2]
    if (!body || !body.includes('<')) continue

    const tokens: KaraokeToken[] = []
    WORD_TAG_RXP.lastIndex = 0
    let firstTagIndex = -1
    let wordMatch: RegExpExecArray | null
    while ((wordMatch = WORD_TAG_RXP.exec(body)) !== null) {
      if (firstTagIndex === -1) firstTagIndex = wordMatch.index
      const startMs = Math.max(0, parseInt(wordMatch[1], 10) || 0)
      const durationMs = Math.max(1, parseInt(wordMatch[2], 10) || 1)
      const text = wordMatch[3] ?? ''
      if (text.length > 0) {
        tokens.push({ startMs, durationMs, text })
      }
    }
    if (!tokens.length) continue
    if (firstTagIndex > 0) {
      const prefix = body.slice(0, firstTagIndex)
      if (prefix) {
        tokens.unshift({ startMs: 0, durationMs: 1, text: prefix })
      }
    }

    SINGLE_TIME_RXP.lastIndex = 0
    let tMatch: RegExpExecArray | null
    while ((tMatch = SINGLE_TIME_RXP.exec(timeHeader)) !== null) {
      const baseMs = Math.max(0, parseTimeTagToMs(tMatch[1], tMatch[2], tMatch[3]) - offsetMs)
      byTime.set(baseMs, tokens)
    }
  }

  if (byTime.size === 0) return null
  const sortedTimes = Array.from(byTime.keys()).sort((a, b) => a - b)
  return { offsetMs, byTime, sortedTimes }
}

export const lookupKaraokeTokens = (
  map: KaraokeLineMap | null,
  lineTimeMs: number,
): KaraokeToken[] | null => {
  if (!map || lineTimeMs < 0) return null
  const exact = map.byTime.get(lineTimeMs)
  if (exact) return exact

  // Binary search nearest timestamp within +-35ms tolerance (handles 2-digit vs 3-digit ms tags)
  const arr = map.sortedTimes
  let lo = 0
  let hi = arr.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const val = arr[mid]
    const diff = val - lineTimeMs
    if (Math.abs(diff) <= 35) {
      return map.byTime.get(val) ?? null
    }
    if (val < lineTimeMs) lo = mid + 1
    else hi = mid - 1
  }
  return null
}

/**
 * Reactive hook returning parsed word-by-word karaoke map for the current track.
 */
export const useKaraokeLyricMap = (enabled: boolean): KaraokeLineMap | null => {
  const [lxlrc, setLxlrc] = useState<string | null>(() => playerState.musicInfo.lxlrc)

  useEffect(() => {
    setLxlrc(playerState.musicInfo.lxlrc)
    const sync = () => {
      setLxlrc(playerState.musicInfo.lxlrc)
    }
    global.state_event.on('playerMusicInfoChanged', sync)
    global.app_event.on('lyricUpdated', sync)
    return () => {
      global.state_event.off('playerMusicInfoChanged', sync)
      global.app_event.off('lyricUpdated', sync)
    }
  }, [])

  return useMemo(() => {
    if (!enabled) return null
    return parseKaraokeLyricMap(lxlrc)
  }, [enabled, lxlrc])
}
