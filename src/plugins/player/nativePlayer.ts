import { type EmitterSubscription, NativeEventEmitter, NativeModules } from 'react-native'

export enum PlayerState {
  None = 0,
  Stopped = 1,
  Paused = 2,
  Playing = 3,
  Buffering = 6,
  Connecting = 8,
}

export enum PlayerEvent {
  PlaybackState = 'playback-state',
  PlaybackTrackEnded = 'playback-track-ended',
  PlaybackError = 'playback-error',
  PlaybackAudioFormat = 'playback-audio-format',
  RemotePlay = 'remote-play',
  RemotePause = 'remote-pause',
  RemoteStop = 'remote-stop',
  RemoteNext = 'remote-next',
  RemotePrevious = 'remote-previous',
  RemoteSeek = 'remote-seek',
  RemoteDuck = 'remote-duck',
  RemoteToggleFavorite = 'remote-toggle-favorite',
}

export interface AudioFormatInfo {
  codec: string
  mimeType: string
  sampleRate: number
  bitDepth: number
  bitrate: number
  channelCount: number
}

export interface PlaybackSnapshot {
  state: PlayerState
  position: number
  duration: number
  buffered: number
}

export interface SetupPlayerOptions {
  maxCacheSize?: number
  maxBuffer?: number
  handleAudioFocus?: boolean
  audioOffload?: boolean
}

export interface UpdatePlayerOptions {
  stopWithApp?: boolean
}

export interface NowPlayingMetadataPayload {
  title?: string
  artist?: string
  album?: string
  artwork?: string
  duration?: number
  lyric?: string
}

export interface NowPlayingTitlesPayload {
  title?: string
  artist?: string
  album?: string
  lyric?: string
}

interface NativeXmusicPlayerSpec {
  setupPlayer: (options: SetupPlayerOptions) => Promise<void>
  updateOptions: (options: UpdatePlayerOptions) => Promise<void>
  loadTrack: (track: LX.Player.Track, startTimeSec: number, autoPlay: boolean) => Promise<void>
  play: () => Promise<void>
  pause: () => Promise<void>
  stop: (keepSession: boolean) => Promise<void>
  seekTo: (seconds: number) => Promise<void>
  setVolume: (volume: number) => Promise<void>
  setRate: (rate: number) => Promise<void>
  updateNowPlayingMetadata: (metadata: NowPlayingMetadataPayload, isPlaying: boolean) => Promise<void>
  updateNowPlayingTitles: (titles: NowPlayingTitlesPayload) => Promise<void>
  setFavoriteState: (favorite: boolean) => Promise<void>
  setAudioTransitionConfig: (softPlayPause: boolean, crossfadeMs: number) => Promise<void>
  getAudioSessionId: () => Promise<number>
  getState: () => Promise<PlayerState>
  getPosition: () => Promise<number>
  getDuration: () => Promise<number>
  getPlaybackSnapshot: () => Promise<PlaybackSnapshot>
  getAudioFormat: () => Promise<AudioFormatInfo | null>
  isCached: (url: string) => Promise<boolean>
  getCacheSize: () => Promise<number>
  clearCache: () => Promise<void>
  prefetchTrack: (track: LX.Player.Track, maxBytes?: number) => Promise<void>
  destroy: () => Promise<void>
}

const nativeModule = NativeModules.XmusicPlayerModule as NativeXmusicPlayerSpec
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const eventEmitter = new NativeEventEmitter(NativeModules.XmusicPlayerModule)

export const addPlayerEventListener = <T = any>(
  event: PlayerEvent,
  listener: (data: T) => void,
): EmitterSubscription => {
  return eventEmitter.addListener(event, listener)
}

export default nativeModule
