// import { LIST_ID_LOVE } from '@/config/constant'

import { updateMetaData } from '@/plugins/player'
import playerState from '@/store/player/state'

export default () => {
  const buttons = {
    empty: true,
    collect: false,
    play: false,
    prev: true,
    next: true,
  }
  const setButtons = () => {
    if (!playerState.playMusicInfo.musicInfo) return
    void updateMetaData(playerState.musicInfo, playerState.isPlay)
  }

  const handlePlay = () => {
    if (buttons.play) return
    buttons.play = true
    setButtons()
  }
  const handlePause = () => {
    if (!buttons.play) return
    buttons.play = false
    setButtons()
  }

  global.app_event.on('play', handlePlay)
  global.app_event.on('pause', handlePause)
  global.app_event.on('stop', handlePause)

  return async() => {
    setButtons()
  }
}
