/* eslint-disable @typescript-eslint/no-misused-promises */
import nativePlayer, { addPlayerEventListener, PlayerEvent, PlayerState } from './nativePlayer'
import { isTempId } from './utils'
import { exitApp } from '@/core/common'
import { pause, play, playNext, playPrev } from '@/core/player/player'
import { toggleCurrentTrackFavoriteSilently } from '@/core/player/favoriteSync'

let isInitialized = false

// 销毁播放器并退出
const handleExitApp = async(reason: string) => {
  global.lx.isPlayedStop = false
  exitApp(reason)
}

const registerPlaybackService = () => {
  if (isInitialized) return

  console.log('reg services...')
  addPlayerEventListener(PlayerEvent.RemotePlay, () => {
    play()
  })

  addPlayerEventListener(PlayerEvent.RemotePause, () => {
    void pause()
  })

  addPlayerEventListener(PlayerEvent.RemoteNext, () => {
    void playNext()
  })

  addPlayerEventListener(PlayerEvent.RemotePrevious, () => {
    void playPrev()
  })

  addPlayerEventListener(PlayerEvent.RemoteStop, () => {
    void handleExitApp('Remote Stop')
  })

  addPlayerEventListener(PlayerEvent.PlaybackError, (err: any) => {
    console.log('playback-error', err)
    global.app_event.error()
    global.app_event.playerError()
  })

  addPlayerEventListener<{ position: number }>(PlayerEvent.RemoteSeek, ({ position }) => {
    global.app_event.setProgress(position)
  })

  addPlayerEventListener(PlayerEvent.RemoteToggleFavorite, () => {
    void toggleCurrentTrackFavoriteSilently()
  })

  addPlayerEventListener<{ state: PlayerState }>(PlayerEvent.PlaybackState, info => {
    if (global.lx.gettingUrlId || isTempId()) return

    switch (info.state) {
      case PlayerState.None:
        break
      case PlayerState.Stopped:
      case PlayerState.Paused:
        global.app_event.playerPause()
        global.app_event.pause()
        break
      case PlayerState.Playing:
        global.app_event.playerPlaying()
        global.app_event.play()
        break
      case PlayerState.Buffering:
        global.app_event.pause()
        global.app_event.playerWaiting()
        break
      case PlayerState.Connecting:
        global.app_event.playerLoadstart()
        break
      default:
        break
    }
    if (global.lx.isPlayedStop) void handleExitApp('Timeout Exit')
  })

  addPlayerEventListener(PlayerEvent.PlaybackTrackEnded, async() => {
    if (global.lx.gettingUrlId) return
    global.lx.playerTrackId = ''
    if (global.lx.isPlayedStop) {
      await handleExitApp('Timeout Exit')
      return
    }
    await nativePlayer.pause()
    global.app_event.playerPause()
    global.app_event.pause()
    global.app_event.playerEnded()
    global.app_event.playerEmptied()
  })

  isInitialized = true
}

export default () => {
  if (global.lx.playerStatus.isRegisteredService) return
  console.log('handle registerPlaybackService...')
  registerPlaybackService()
  global.lx.playerStatus.isRegisteredService = true
}
