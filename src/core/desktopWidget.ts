import { processColor } from 'react-native'
import { LIST_IDS } from '@/config/constant'
import { getListMusics } from '@/core/list'
import { resolveCurrentPlayMusicInfo } from '@/core/player/favoriteSync'
import { onLyricLinePlay } from '@/core/desktopLyric'
import playerState from '@/store/player/state'
import themeState from '@/store/theme/state'
import { updateWidgetState } from '@/utils/nativeModules/utils'

const formatUri = (url: string | null): string => {
  if (!url) return ''
  return url.startsWith('/') ? `file://${url}` : url
}

export default () => {
  let cachedFavorite = false
  let currentLyric = ''

  const pushFullWidgetSync = () => {
    const accent = (processColor(themeState.theme['m3-primary']) as number) ?? 0
    const pic = playerState.musicInfo.pic && playerState.musicInfo.pic != playerState.loadErrorPicUrl
      ? formatUri(playerState.musicInfo.pic)
      : ''
    updateWidgetState({
      title: playerState.musicInfo.name || 'Xmusic',
      artist: playerState.musicInfo.singer || '',
      lyric: currentLyric,
      isPlaying: playerState.isPlay,
      isFavorite: cachedFavorite,
      accentColor: accent,
      coverUri: pic,
    })
  }

  const refreshFavoriteAndSync = async() => {
    const target = resolveCurrentPlayMusicInfo()
    if (!target) {
      cachedFavorite = false
      pushFullWidgetSync()
      return
    }
    try {
      const loves = await getListMusics(LIST_IDS.LOVE)
      if (resolveCurrentPlayMusicInfo()?.id === target.id) {
        cachedFavorite = loves.some(m => m.id == target.id)
      }
    } catch {
      cachedFavorite = false
    }
    pushFullWidgetSync()
  }

  onLyricLinePlay(({ text }) => {
    const clean = text?.trim() ?? ''
    if (clean === currentLyric) return
    currentLyric = clean
    updateWidgetState({
      lyric: currentLyric,
      isPlaying: playerState.isPlay,
    })
  })

  global.state_event.on('playerMusicInfoChanged', () => {
    currentLyric = playerState.lastLyric ?? ''
    void refreshFavoriteAndSync()
  })

  global.state_event.on('playStateChanged', (playing) => {
    updateWidgetState({ isPlaying: playing })
  })

  global.state_event.on('themeUpdated', (theme) => {
    const accent = (processColor(theme['m3-primary']) as number) ?? 0
    updateWidgetState({ accentColor: accent })
  })

  global.app_event.on('myListMusicUpdate', (ids: string[]) => {
    if (ids.includes(LIST_IDS.LOVE)) {
      void refreshFavoriteAndSync()
    }
  })

  void refreshFavoriteAndSync()
}
