import playerState from '@/store/player/state'
import { setBgPic } from '@/core/common'
import { setCoverPalette } from '@/core/theme'
import { extractCoverPalette } from '@/utils/nativeModules/utils'

const formatUri = <T extends string | null>(url: T) => {
  return (typeof url == 'string' && url.startsWith('/')) ? `file://${url}` : url
}

export default async(setting: LX.AppSetting) => {
  let currentMusicId: string | null = null
  let pic: string | null = null
  let isDynamicBg = setting['theme.dynamicBg']
  let isDynamicCoverColor = setting['theme.dynamicCoverColor']
  let paletteReqSeq = 0
  let pendingResetTimer: ReturnType<typeof setTimeout> | null = null

  const clearPendingReset = () => {
    if (pendingResetTimer != null) {
      clearTimeout(pendingResetTimer)
      pendingResetTimer = null
    }
  }

  const handleUpdatePic = (targetPic: string) => {
    if (!targetPic) return
    const picUrl = formatUri(targetPic)
    if (isDynamicBg) setBgPic(picUrl)
    else setBgPic(null)

    if (!isDynamicBg && !isDynamicCoverColor) {
      setCoverPalette(null, null)
      return
    }

    const reqId = ++paletteReqSeq
    void extractCoverPalette(picUrl).then((res) => {
      if (reqId != paletteReqSeq || targetPic != playerState.musicInfo.pic) return
      if (!res.isNeutral && res.seedRgb && res.colors.length) {
        setCoverPalette(res.seedRgb, res.colors)
      } else {
        setCoverPalette(null, null)
      }
    }).catch(() => {
      if (reqId != paletteReqSeq) return
      setCoverPalette(null, null)
    })
  }

  const handlePicUpdate = () => {
    const nextId = playerState.musicInfo.id
    const nextPic = (playerState.musicInfo.pic && playerState.musicInfo.pic != playerState.loadErrorPicUrl)
      ? playerState.musicInfo.pic
      : null

    if (nextPic) {
      clearPendingReset()
      currentMusicId = nextId
      if (nextPic == pic) return
      pic = nextPic
      handleUpdatePic(pic)
      return
    }

    if (!nextId) {
      clearPendingReset()
      currentMusicId = null
      pic = null
      paletteReqSeq++
      setBgPic(null)
      setCoverPalette(null, null)
      return
    }

    if (nextId != currentMusicId) {
      // Track switched and its cover URL is not resolved yet: keep the previous
      // cover palette briefly so async getPicPath does not flash back to static seed,
      // then self-heal if the new track stays coverless (e.g. local track with no art).
      currentMusicId = nextId
      pic = null
      paletteReqSeq++
      clearPendingReset()
      const targetId = nextId
      pendingResetTimer = setTimeout(() => {
        pendingResetTimer = null
        if (currentMusicId != targetId) return
        const resolvedPic = (playerState.musicInfo.pic && playerState.musicInfo.pic != playerState.loadErrorPicUrl)
          ? playerState.musicInfo.pic
          : null
        if (!resolvedPic) {
          setBgPic(null)
          setCoverPalette(null, null)
        }
      }, 1200)
      return
    }

    if (pic != null) {
      // Same track's previously known cover was cleared (e.g. image load error).
      clearPendingReset()
      pic = null
      paletteReqSeq++
      setBgPic(null)
      setCoverPalette(null, null)
    }
  }

  const handleConfigUpdate = (keys: Array<keyof LX.AppSetting>, nextSetting: Partial<LX.AppSetting>) => {
    const changedBg = keys.includes('theme.dynamicBg')
    const changedCoverSeed = keys.includes('theme.dynamicCoverColor')
    if (!changedBg && !changedCoverSeed) return

    if (changedBg && nextSetting['theme.dynamicBg'] != null) {
      isDynamicBg = nextSetting['theme.dynamicBg']
    }
    if (changedCoverSeed && nextSetting['theme.dynamicCoverColor'] != null) {
      isDynamicCoverColor = nextSetting['theme.dynamicCoverColor']
    }

    if (!isDynamicBg) setBgPic(null)

    if (isDynamicBg || isDynamicCoverColor) {
      if (pic) handleUpdatePic(pic)
    } else {
      clearPendingReset()
      paletteReqSeq++
      setCoverPalette(null, null)
    }
  }

  handlePicUpdate()
  global.state_event.on('playerMusicInfoChanged', handlePicUpdate)
  global.state_event.on('configUpdated', handleConfigUpdate)
}
