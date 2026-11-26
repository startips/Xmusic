import { useEffect, useState } from 'react'
import nativePlayer, { addPlayerEventListener, PlayerEvent, PlayerState } from './nativePlayer'

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
