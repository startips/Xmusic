export const LIST_IDS = {
  DEFAULT: 'default',
  LOVE: 'love',
  TEMP: 'temp',
  DOWNLOAD: 'download',
  PLAY_LATER: null,
} as const

export const SYNC_CODE = {
  helloMsg: 'Hello~::^-^::~v4~',
  idPrefix: 'OjppZDo6',
  authMsg: 'lx-music auth::',
  msgAuthFailed: 'Auth failed',
  msgBlockedIp: 'Blocked IP',
  msgConnect: 'lx-music connect',


  authFailed: 'Auth failed',
  missingAuthCode: 'Missing auth code',
  getServiceIdFailed: 'Get service id failed',
  connectServiceFailed: 'Connect service failed',
  connecting: 'Connecting...',
  unknownServiceAddress: 'Unknown service address',
  lowServiceVersion: 'Sync server version too low, please upgrade server to latest',
  highServiceVersion: 'Sync server version too high, please upgrade app to latest',
} as const

export const SYNC_CLOSE_CODE = {
  normal: 1000,
  failed: 4100,
} as const
