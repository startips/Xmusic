import { useEffect, useState, useRef } from 'react'
import nativePlayer, { addPlayerEventListener, PlayerEvent, PlayerState } from './nativePlayer'

/** Get current playback state and subsequent updates */
export const usePlaybackState = () => {
  const [state, setState] = useState(PlayerState.None)

  useEffect(() => {
    async function setPlayerState() {
      const playerState = await nativePlayer.getState()
      setState(playerState)
    }

    void setPlayerState()

    const sub = addPlayerEventListener<{ state: PlayerState }>(PlayerEvent.PlaybackState, data => {
      setState(data.state)
    })

    return () => { sub.remove() }
  }, [])

  return state
}

const pollTrackPlayerStates = [
  PlayerState.Playing,
  PlayerState.Buffering,
] as const

/**
 * Poll for track progress using a single native snapshot call per interval.
 * @param updateInterval - ms interval
 */
export function useProgress(updateInterval: number) {
  const [state, setState] = useState({ position: 0, duration: 0, buffered: 0 })
  const playerState = usePlaybackState()
  const stateRef = useRef(state)
  const isUnmountedRef = useRef(true)
  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  const getProgress = async() => {
    const snap = await nativePlayer.getPlaybackSnapshot()
    if (isUnmountedRef.current) return

    if (
      snap.position === stateRef.current.position &&
      snap.duration === stateRef.current.duration &&
      snap.buffered === stateRef.current.buffered
    ) return

    const next = {
      position: snap.position,
      duration: snap.duration,
      buffered: snap.buffered,
    }
    stateRef.current = next
    setState(next)
  }

  useEffect(() => {
    // @ts-expect-error
    if (!pollTrackPlayerStates.includes(playerState)) return

    void getProgress()

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const poll = setInterval(getProgress, updateInterval || 1000)
    return () => { clearInterval(poll) }
  }, [playerState, updateInterval])

  return state
}

export function useBufferProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let isUnmounted = false
    let preBuffered = 0
    let duration = 0
    let interval: ReturnType<typeof setInterval> | null = null

    const clearItv = () => {
      if (!interval) return
      clearInterval(interval as unknown as number)
      interval = null
    }
    const updateBuffer = async() => {
      const snap = await nativePlayer.getPlaybackSnapshot()
      if (!duration && snap.duration > 0) duration = snap.duration
      const buffered = snap.buffered
      if (buffered > 0 && buffered == duration) clearItv()
      if (buffered == preBuffered || isUnmounted) return
      preBuffered = buffered
      setProgress(duration ? (buffered / duration) : 0)
    }

    const sub = addPlayerEventListener<{ state: PlayerState }>(PlayerEvent.PlaybackState, data => {
      switch (data.state) {
        case PlayerState.None:
          setProgress(0)
          break
        case PlayerState.Buffering:
          clearItv()
          duration = 0
          interval = setInterval(updateBuffer, 1000)
          void updateBuffer()
          break
      }
    })

    void updateBuffer()
    void nativePlayer.getState().then((state) => {
      if (state == PlayerState.Buffering) interval = setInterval(updateBuffer, 1000)
    })
    return () => {
      isUnmounted = true
      sub.remove()
      clearItv()
    }
  }, [])

  return progress
}
