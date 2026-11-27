declare global {
  namespace LX {
    namespace Player {
      interface MusicInfo {
        id: string | null
        pic: string | null | undefined
        lrc: string | null
        tlrc: string | null
        rlrc: string | null
        lxlrc: string | null
        rawlrc: string | null
        // url: string | null
        name: string
        singer: string
        album: string
      }

      interface LyricInfo extends LX.Music.LyricInfo {
        rawlrcInfo: LX.Music.LyricInfo
      }

      interface AudioFormatInfo {
        codec: string
        mimeType: string
        sampleRate: number
        bitDepth: number
        bitrate: number
        channelCount: number
      }

      interface PlayQualityInfo {
        musicId: string | null
        targetQuality: LX.Quality | null
        requestedQuality: LX.Quality | null
        actualQuality: LX.Quality | null
        source: LX.Source | null
        actualSource: LX.Source | null
        isSourceToggled: boolean
        isDowngraded: boolean
        localExt: string | null
        audioFormat: AudioFormatInfo | null
        isSwitching: boolean
      }

      type PlayMusic = LX.Music.MusicInfo | LX.Download.ListItem

      type PlayMusicInfo = Readonly<{
        /**
         * 当前播放歌曲的列表 id
         */
        musicInfo: PlayMusic
        /**
          * 当前播放歌曲的列表 id
          */
        listId: string
        /**
          * 是否属于 “稍后播放”
          */
        isTempPlay: boolean
      }>

      interface PlayInfo {
        /**
         * 当前正在播放歌曲 index
         */
        playIndex: number
        /**
        * 播放器的播放列表 id
        */
        playerListId: string | null
        /**
        * 播放器播放歌曲 index
        */
        playerPlayIndex: number
      }

      interface TempPlayListItem {
        /**
         * 播放列表id
         */
        listId: string | null
        /**
         * 歌曲信息
         */
        musicInfo: PlayMusic
        /**
         * 是否添加到列表顶部
         */
        isTop?: boolean
      }

      interface SavedPlayInfo {
        time: number
        maxTime: number
        listId: string
        index: number
      }

      interface Track {
        id?: string
        url: string
        title?: string
        artist?: string
        album?: string
        artwork?: string
        userAgent?: string
        headers?: Record<string, string>
        musicId: string
        cacheKey?: string
        lyric?: string
        duration?: number
      }
    }
  }
}

export {}
