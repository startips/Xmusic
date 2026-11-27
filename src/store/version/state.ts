import { version } from '../../../package.json'

export interface ProgressInfo {
  total: number
  current: number
}

export interface VersionInfo {
  version: string
  desc: string
  history?: LX.VersionInfo[]
  channel?: LX.UpdateChannel
  assets?: Record<string, string>
}

export interface InitState {
  showModal: boolean
  versionInfo: {
    version: string
    newVersion: VersionInfo | null
    showModal: boolean
    isUnknown: boolean
    isLatest: boolean
    reCheck: boolean
    status: LX.UpdateStatus
    channel: LX.UpdateChannel
  }
  ignoreVersion: string | null
  progress: ProgressInfo
}

const state: InitState = {
  showModal: false,
  versionInfo: {
    version: process.versions?.app || version,
    newVersion: null,
    showModal: false,
    reCheck: false,
    isUnknown: false,
    isLatest: false,
    status: 'checking',
    channel: 'stable',
  },
  ignoreVersion: null,
  progress: {
    total: 0,
    current: 0,
  },
}


export default state
