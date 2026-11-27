import { getPlayQuality } from '@/core/music/utils'

export const STANDARD_QUALITY_LIST: LX.Quality[] = ['flac24bit', 'flac', '320k', '128k']

export const QUALITY_RANK: Record<LX.Quality, number> = {
  flac24bit: 6,
  wav: 5,
  flac: 4,
  ape: 4,
  '320k': 3,
  '192k': 2,
  '128k': 1,
}

const LOSSLESS_CODECS = new Set(['FLAC', 'WAV', 'APE', 'ALAC', 'PCM', 'DSD'])
const LOSSLESS_QUALITIES = new Set<LX.Quality>(['flac24bit', 'flac', 'wav', 'ape'])

export const isLosslessCodec = (codec?: string | null): boolean => {
  if (!codec) return false
  return LOSSLESS_CODECS.has(codec.toUpperCase())
}

export const isLosslessQuality = (quality?: LX.Quality | null): boolean => {
  if (!quality) return false
  return LOSSLESS_QUALITIES.has(quality)
}

export const isQualityDowngraded = (target?: LX.Quality | null, actual?: LX.Quality | null): boolean => {
  if (!target || !actual) return false
  return (QUALITY_RANK[actual] ?? 0) < (QUALITY_RANK[target] ?? 0)
}

export const getQualityShortLabel = (quality?: LX.Quality | null): string => {
  switch (quality) {
    case 'flac24bit':
      return '24bit'
    case 'flac':
    case 'ape':
    case 'wav':
      return 'SQ'
    case '320k':
      return 'HQ'
    case '192k':
      return '192K'
    case '128k':
    default:
      return '128K'
  }
}

export const formatAudioTechSummary = (audioFormat: LX.Player.AudioFormatInfo | null): string => {
  if (!audioFormat) return ''
  const parts: string[] = []
  if (audioFormat.codec) parts.push(audioFormat.codec.toUpperCase())
  if (audioFormat.sampleRate > 0) {
    const khz = Number((audioFormat.sampleRate / 1000).toFixed(1))
    parts.push(`${khz} kHz`)
  }
  if (audioFormat.bitDepth > 0) {
    parts.push(`${audioFormat.bitDepth}-bit`)
  }
  if (audioFormat.bitrate > 0) {
    parts.push(`${Math.round(audioFormat.bitrate / 1000)} kbps`)
  }
  return parts.join(' · ')
}

export const extractOnlineMusicInfo = (musicInfo: LX.Player.PlayMusic | null): LX.Music.MusicInfoOnline | null => {
  if (!musicInfo) return null
  if ('progress' in musicInfo) return musicInfo.metadata.musicInfo
  if (musicInfo.source === 'local') return null
  return musicInfo
}

export interface QualityBadgeDisplay {
  label: string
  isHighTier: boolean
  effectiveQuality: LX.Quality | null
  isFakeLossless: boolean
  isLocal: boolean
}

export const deriveQualityBadge = (
  info: LX.Player.PlayQualityInfo,
  preferredQuality: LX.Quality,
  musicInfo: LX.Player.PlayMusic | null,
): QualityBadgeDisplay => {
  if (!musicInfo) {
    return {
      label: getQualityShortLabel(preferredQuality),
      isHighTier: isLosslessQuality(preferredQuality),
      effectiveQuality: preferredQuality,
      isFakeLossless: false,
      isLocal: false,
    }
  }

  const onlineInfo = extractOnlineMusicInfo(musicInfo)
  if (!onlineInfo) {
    const rawExt = !('progress' in musicInfo) && musicInfo.source === 'local' ? musicInfo.meta.ext : ''
    const localExt = rawExt || (info.localExt ?? '')
    const rawCodec = info.audioFormat?.codec ?? ''
    const codec = (rawCodec || localExt || 'LOCAL').toUpperCase()
    const is24Bit = codec === 'FLAC' && (info.audioFormat?.bitDepth ?? 0) >= 24
    return {
      label: is24Bit ? '24bit' : codec.slice(0, 5),
      isHighTier: isLosslessCodec(codec),
      effectiveQuality: null,
      isFakeLossless: false,
      isLocal: true,
    }
  }

  const baseQuality = info.actualQuality ?? info.requestedQuality ?? getPlayQuality(preferredQuality, onlineInfo)
  const audioFormat = info.audioFormat

  if (audioFormat?.codec) {
    if (isLosslessCodec(audioFormat.codec)) {
      if (audioFormat.bitDepth >= 24) {
        return {
          label: '24bit',
          isHighTier: true,
          effectiveQuality: 'flac24bit',
          isFakeLossless: false,
          isLocal: false,
        }
      }
      return {
        label: 'SQ',
        isHighTier: true,
        effectiveQuality: baseQuality === 'wav' || baseQuality === 'ape' ? baseQuality : 'flac',
        isFakeLossless: false,
        isLocal: false,
      }
    }

    const isFakeLossless = isLosslessQuality(baseQuality)
    if (audioFormat.bitrate >= 256_000) {
      return {
        label: 'HQ',
        isHighTier: false,
        effectiveQuality: '320k',
        isFakeLossless,
        isLocal: false,
      }
    }
    if (audioFormat.bitrate > 0) {
      return {
        label: '128K',
        isHighTier: false,
        effectiveQuality: '128k',
        isFakeLossless,
        isLocal: false,
      }
    }
    if (isFakeLossless) {
      return {
        label: audioFormat.codec.toUpperCase().slice(0, 5),
        isHighTier: false,
        effectiveQuality: '320k',
        isFakeLossless: true,
        isLocal: false,
      }
    }
  }

  return {
    label: getQualityShortLabel(baseQuality),
    isHighTier: isLosslessQuality(baseQuality),
    effectiveQuality: baseQuality,
    isFakeLossless: false,
    isLocal: false,
  }
}

export interface QualityOptionAvailability {
  quality: LX.Quality
  supported: boolean
  reason: 'source_unsupported' | 'track_unsupported' | null
  size: string | null
}

export const getOnlineQualityAvailability = (
  musicInfo: LX.Music.MusicInfoOnline,
  quality: LX.Quality,
): QualityOptionAvailability => {
  const activeInfo = musicInfo.meta.toggleMusicInfo ?? musicInfo
  const sourceList = global.lx.qualityList[activeInfo.source] ?? global.lx.qualityList[musicInfo.source] ?? []
  const hasInSource = sourceList.length === 0 || sourceList.includes(quality)
  const metaEntry = activeInfo.meta._qualitys[quality] ?? musicInfo.meta._qualitys[quality]
  const hasInTrack = quality === '128k' || Boolean(metaEntry)

  let reason: QualityOptionAvailability['reason'] = null
  if (!hasInSource) reason = 'source_unsupported'
  else if (!hasInTrack) reason = 'track_unsupported'

  return {
    quality,
    supported: hasInSource && hasInTrack,
    reason,
    size: metaEntry?.size ? metaEntry.size : null,
  }
}
