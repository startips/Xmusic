import { NativeModules, NativeEventEmitter } from 'react-native'

const { LyricModule } = NativeModules

/**
 * 发送歌词事件（用于蓝牙歌词 / 桌面小组件）
 */
export const setSendLyricTextEvent = async(isSend: boolean) => {
  return LyricModule.setSendLyricTextEvent(isSend)
}

export const play = async(time: number): Promise<void> => {
  return LyricModule.play(time)
}

export const pause = async(): Promise<void> => {
  return LyricModule.pause()
}

export const setLyric = async(lyric: string, translation: string, romalrc: string): Promise<void> => {
  return LyricModule.setLyric(lyric, translation || '', romalrc || '')
}

export const setPlaybackRate = async(rate: number): Promise<void> => {
  return LyricModule.setPlaybackRate(rate)
}

export const toggleTranslation = async(isShowTranslation: boolean): Promise<void> => {
  return LyricModule.toggleTranslation(isShowTranslation)
}

export const toggleRoma = async(isShowRoma: boolean): Promise<void> => {
  return LyricModule.toggleRoma(isShowRoma)
}

export const onLyricLinePlay = (handler: (lineInfo: { text: string, extendedLyrics: string[] }) => void): () => void => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const eventEmitter = new NativeEventEmitter(LyricModule)
  const eventListener = eventEmitter.addListener('lyric-line-play', event => {
    handler(event as { text: string, extendedLyrics: string[] })
  })

  return () => {
    eventListener.remove()
  }
}
