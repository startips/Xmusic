import { useEffect, useState } from 'react'
import nativePlayer from './nativePlayer'
import playerState from '@/store/player/state'
import { setBufferProgress } from '@/core/player/progress'

export function useBufferProgress() {
  const [progress, setProgress] = useState(playerState.bufferedProgress)

  useEffect(() => {
    let isUnmounted = false
    setProgress(playerState.bufferedProgress)

    const handleChange = (next: number) => {
      if (!isUnmounted) setProgress(next)
    }
    global.state_event.on('bufferProgressChanged', handleChange)

    if (playerState.bufferedProgress === 0 && playerState.musicInfo.id) {
      void nativePlayer.getPlaybackSnapshot().then((snap) => {
        if (isUnmounted) return
        const dur = snap.duration > 0 ? snap.duration : playerState.progress.maxPlayTime
        if (dur > 0 && snap.buffered > 0) {
          setBufferProgress(snap.buffered / dur)
        }
      }).catch(() => {})
    }

    return () => {
      isUnmounted = true
      global.state_event.off('bufferProgressChanged', handleChange)
    }
  }, [])

  return progress
}
