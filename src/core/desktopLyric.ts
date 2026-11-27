import {
  setSendLyricTextEvent,
  setLyric,
  play,
  pause,
  setPlaybackRate,
  toggleTranslation,
  toggleRoma,
} from '@/utils/nativeModules/lyricDesktop'
import settingState from '@/store/setting/state'
import playerState from '@/store/player/state'
import { tranditionalize } from '@/utils/simplify-chinese-main'
import { getPosition } from '@/plugins/player'

export {
  onLyricLinePlay,
} from '@/utils/nativeModules/lyricDesktop'

export const playDesktopLyric = play
export const pauseDesktopLyric = pause
export const setDesktopLyric = setLyric
export const setDesktopLyricPlaybackRate = setPlaybackRate
export const toggleDesktopLyricTranslation = toggleTranslation
export const toggleDesktopLyricRoma = toggleRoma

export const showRemoteLyric = async(isSend: boolean) => {
  await setSendLyricTextEvent(isSend)
  if (isSend) {
    let lrc = playerState.musicInfo.lrc ?? ''
    let tlrc = playerState.musicInfo.tlrc ?? ''
    let rlrc = playerState.musicInfo.rlrc ?? ''
    if (settingState.setting['player.isS2t']) {
      lrc = tranditionalize(lrc)
      tlrc = tranditionalize(tlrc)
    }
    await setLyric(lrc, tlrc, rlrc)
    if (playerState.isPlay && !global.lx.gettingUrlId) {
      void getPosition().then(position => {
        void play(position * 1000)
      })
    }
  }
}
