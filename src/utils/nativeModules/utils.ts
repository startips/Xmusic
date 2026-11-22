import { AppState, NativeEventEmitter, NativeModules } from 'react-native'

const { UtilsModule } = NativeModules

export const exitApp = UtilsModule.exitApp

export const getSupportedAbis = UtilsModule.getSupportedAbis

export const installApk = (filePath: string, fileProviderAuthority: string) => UtilsModule.installApk(filePath, fileProviderAuthority)


export const screenkeepAwake = () => {
  if (global.lx.isScreenKeepAwake) return
  global.lx.isScreenKeepAwake = true
  UtilsModule.screenkeepAwake()
}
export const screenUnkeepAwake = () => {
  // console.log('screenUnkeepAwake')
  if (!global.lx.isScreenKeepAwake) return
  global.lx.isScreenKeepAwake = false
  UtilsModule.screenUnkeepAwake()
}

export const getWIFIIPV4Address = UtilsModule.getWIFIIPV4Address as () => Promise<string>

export const getDeviceName = async(): Promise<string> => {
  return UtilsModule.getDeviceName().then((deviceName: string) => deviceName || 'Unknown')
}

export const isNotificationsEnabled = UtilsModule.isNotificationsEnabled as () => Promise<boolean>

export const requestNotificationPermission = async() => new Promise<boolean>((resolve) => {
  let subscription = AppState.addEventListener('change', (state) => {
    if (state != 'active') return
    subscription.remove()
    setTimeout(() => {
      void isNotificationsEnabled().then(resolve)
    }, 1000)
  })
  UtilsModule.openNotificationPermissionActivity().then((result: boolean) => {
    if (result) return
    subscription.remove()
    resolve(false)
  })
})

export const shareText = async(shareTitle: string, title: string, text: string): Promise<void> => {
  UtilsModule.shareText(shareTitle, title, text)
}

export const getSystemLocales = async(): Promise<string> => {
  return UtilsModule.getSystemLocales()
}

export const onScreenStateChange = (handler: (state: 'ON' | 'OFF') => void): () => void => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const eventEmitter = new NativeEventEmitter(UtilsModule)
  const eventListener = eventEmitter.addListener('screen-state', event => {
    handler(event.state as 'ON' | 'OFF')
  })

  return () => {
    eventListener.remove()
  }
}

export const getWindowSize = async(): Promise<{ width: number, height: number }> => {
  return UtilsModule.getWindowSize()
}

export const getNavigationBarHeight = async(): Promise<number> => {
  return UtilsModule.getNavigationBarHeight()
}

export interface NativeSafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
  hasInsets: boolean
}

export const getSafeAreaInsets = async(): Promise<NativeSafeAreaInsets> => {
  if (!UtilsModule.getSafeAreaInsets) {
    return { top: 0, bottom: 0, left: 0, right: 0, hasInsets: false }
  }
  return UtilsModule.getSafeAreaInsets()
}

export const onDisplayChange = (handler: (rotation: number) => void): () => void => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const eventEmitter = new NativeEventEmitter(UtilsModule)
  const eventListener = eventEmitter.addListener('display-changed', event => {
    handler((event?.rotation as number) ?? 0)
  })

  return () => {
    eventListener.remove()
  }
}

export const onWindowSizeChange = (handler: (size: { width: number, height: number }) => void): () => void => {
  UtilsModule.listenWindowSizeChanged()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const eventEmitter = new NativeEventEmitter(UtilsModule)
  const eventListener = eventEmitter.addListener('screen-size-changed', event => {
    handler(event as { width: number, height: number })
  })

  return () => {
    eventListener.remove()
  }
}

export const performHaptic = (type: 'heart' | 'tick' | 'confirm' | 'heavy' | 'light' = 'light'): void => {
  UtilsModule.performHaptic?.(type)
}

export interface CoverPaletteResult {
  isNeutral: boolean
  seedRgb: string | null
  colors: string[]
}

export const extractCoverPalette = async(uri: string): Promise<CoverPaletteResult> => {
  if (!uri || !UtilsModule.extractCoverPalette) {
    return { isNeutral: true, seedRgb: null, colors: [] }
  }
  return UtilsModule.extractCoverPalette(uri)
}

export interface WidgetSyncPayload {
  title?: string
  artist?: string
  lyric?: string
  isPlaying?: boolean
  isFavorite?: boolean
  accentColor?: number
  coverUri?: string
}

export const updateWidgetState = (payload: WidgetSyncPayload): void => {
  UtilsModule.updateWidgetState?.(payload)
}

export const captureViewToPng = async(viewTag: number): Promise<string> => {
  return UtilsModule.captureViewToPng(viewTag)
}

export const shareImage = async(filePath: string, shareTitle = 'Xmusic'): Promise<boolean> => {
  return UtilsModule.shareImage(filePath, shareTitle)
}

export const saveImageToGallery = async(filePath: string, displayName = 'xmusic_poster'): Promise<string> => {
  return UtilsModule.saveImageToGallery(filePath, displayName)
}

export const isIgnoringBatteryOptimization = async(): Promise<boolean> => {
  return UtilsModule.isIgnoringBatteryOptimization()
}

export const requestIgnoreBatteryOptimization = async() => new Promise<boolean>((resolve) => {
  let subscription = AppState.addEventListener('change', (state) => {
    if (state != 'active') return
    subscription.remove()
    setTimeout(() => {
      void isIgnoringBatteryOptimization().then(resolve)
    }, 1000)
  })
  UtilsModule.requestIgnoreBatteryOptimization().then((result: boolean) => {
    if (result) return
    subscription.remove()
    resolve(false)
  })
})
