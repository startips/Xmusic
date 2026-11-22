import { memo, useCallback, useRef, useEffect } from 'react'
import { type LayoutChangeEvent, StyleSheet, View, StatusBar, Dimensions, Keyboard } from 'react-native'
import commonState from '@/store/common/state'
import settingState from '@/store/setting/state'
import { setNavigationBarHeight, setSafeAreaInsets, setStatusbarHeight } from '@/core/common'
import { getNavigationBarHeight, getSafeAreaInsets, onDisplayChange } from '@/utils/nativeModules/utils'
import { windowSizeTools, getWindowSize } from '@/utils/windowSizeTools'

const pxToDp = (px: number, scale: number) => Math.round((px / scale) * 100) / 100

const resolveStatusbarHeight = (winHeight: number, layoutHeight: number, topInsetDp: number, hasRootInsets: boolean) => {
  if (hasRootInsets) {
    if (settingState.setting['common.alwaysKeepStatusbarHeight']) {
      return Math.max(topInsetDp, StatusBar.currentHeight ?? 0)
    }
    return topInsetDp
  }
  return (!settingState.setting['common.alwaysKeepStatusbarHeight'] &&
          parseFloat(winHeight.toFixed(2)) >= parseFloat(layoutHeight.toFixed(2)))
    ? 0
    : (StatusBar.currentHeight ?? 0)
}

let latestMeasureSeq = 0

export default memo(() => {
  const sizeRef = useRef({ winHeight: 0, layoutHeight: 0, topInsetDp: 0, hasRootInsets: false })
  const lastLayoutRef = useRef({ width: 0, height: 0 })
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runMeasure = useCallback((layoutWidth: number, layoutHeight: number) => {
    if (layoutWidth <= 0 || layoutHeight <= 0) return
    const seq = ++latestMeasureSeq
    void Promise.all([getWindowSize(), getNavigationBarHeight(), getSafeAreaInsets()]).then(([size, navBarPx, rawSafe]) => {
      if (seq !== latestMeasureSeq) return
      const scale = Dimensions.get('window').scale || 1
      const safeInsets = {
        top: pxToDp(rawSafe.top, scale),
        bottom: pxToDp(rawSafe.bottom, scale),
        left: pxToDp(rawSafe.left, scale),
        right: pxToDp(rawSafe.right, scale),
      }
      setSafeAreaInsets(safeInsets)

      sizeRef.current = {
        winHeight: size.height,
        layoutHeight,
        topInsetDp: safeInsets.top,
        hasRootInsets: rawSafe.hasInsets,
      }
      const height = resolveStatusbarHeight(size.height, layoutHeight, safeInsets.top, rawSafe.hasInsets)

      if (commonState.statusbarHeight != height) {
        setStatusbarHeight(height)
      }
      const navHeight = pxToDp(navBarPx, scale)
      if (commonState.navigationBarHeight != navHeight) {
        setNavigationBarHeight(navHeight)
      }
      // Do not overwrite window aspect ratio with IME-shrunk height when keyboard is open
      const kbVisible = typeof Keyboard.isVisible === 'function' ? Keyboard.isVisible() : false
      if (!kbVisible) {
        const currentSize = windowSizeTools.getSize()
        if (currentSize.width != layoutWidth || currentSize.height != layoutHeight) {
          windowSizeTools.setWindowSize(layoutWidth, layoutHeight)
        }
      }
    })
  }, [])

  const scheduleMeasure = useCallback((width: number, height: number) => {
    runMeasure(width, height)
    // Android may finish applying rotated DisplayCutout insets a frame after layout/rotation
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      const w = lastLayoutRef.current.width || width
      const h = lastLayoutRef.current.height || height
      runMeasure(w, h)
    }, 120)
  }, [runMeasure])

  const handleLayout = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (lastLayoutRef.current.width === layout.width && lastLayoutRef.current.height === layout.height) return
    lastLayoutRef.current = { width: layout.width, height: layout.height }
    scheduleMeasure(layout.width, layout.height)
  }, [scheduleMeasure])

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      scheduleMeasure(lastLayoutRef.current.width || window.width, lastLayoutRef.current.height || window.height)
    })

    const unlistenDisplay = onDisplayChange(() => {
      const win = Dimensions.get('window')
      scheduleMeasure(lastLayoutRef.current.width || win.width, lastLayoutRef.current.height || win.height)
    })

    const handleSettingUpdate = (keys: Array<keyof LX.AppSetting>) => {
      if (!keys.includes('common.alwaysKeepStatusbarHeight') || !sizeRef.current.layoutHeight) return
      const { winHeight, layoutHeight, topInsetDp, hasRootInsets } = sizeRef.current
      const height = resolveStatusbarHeight(winHeight, layoutHeight, topInsetDp, hasRootInsets)
      if (commonState.statusbarHeight != height) {
        setStatusbarHeight(height)
      }
    }
    global.state_event.on('configUpdated', handleSettingUpdate)

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      subscription.remove()
      unlistenDisplay()
      global.state_event.off('configUpdated', handleSettingUpdate)
    }
  }, [scheduleMeasure])

  return (<View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={handleLayout} />)
}, () => true)
