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
const mountedSizeViews: symbol[] = []
const topListeners = new Set<() => void>()
const isTopSizeView = (id: symbol) => mountedSizeViews[mountedSizeViews.length - 1] === id

export default memo(() => {
  const instanceId = useRef(Symbol('SizeView')).current
  const sizeRef = useRef({ winHeight: 0, layoutHeight: 0, topInsetDp: 0, hasRootInsets: false })
  const lastLayoutRef = useRef({ width: 0, height: 0 })
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runMeasure = useCallback((layoutWidth: number, layoutHeight: number) => {
    if (layoutWidth <= 0 || layoutHeight <= 0 || !isTopSizeView(instanceId)) return
    const seq = ++latestMeasureSeq
    void Promise.all([getWindowSize(), getNavigationBarHeight(), getSafeAreaInsets()]).then(([size, navBarPx, rawSafe]) => {
      if (seq !== latestMeasureSeq || !isTopSizeView(instanceId)) return
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
  }, [instanceId])

  const scheduleMeasure = useCallback((width: number, height: number) => {
    if (!isTopSizeView(instanceId)) return
    runMeasure(width, height)
    // Android may finish applying rotated DisplayCutout insets a frame after layout/rotation
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      if (!isTopSizeView(instanceId)) return
      const w = lastLayoutRef.current.width || width
      const h = lastLayoutRef.current.height || height
      runMeasure(w, h)
    }, 120)
  }, [instanceId, runMeasure])

  const handleLayout = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (lastLayoutRef.current.width === layout.width && lastLayoutRef.current.height === layout.height) return
    lastLayoutRef.current = { width: layout.width, height: layout.height }
    if (!isTopSizeView(instanceId)) return
    scheduleMeasure(layout.width, layout.height)
  }, [instanceId, scheduleMeasure])

  useEffect(() => {
    mountedSizeViews.push(instanceId)
    const triggerTopMeasure = () => {
      if (!isTopSizeView(instanceId)) return
      const win = Dimensions.get('window')
      const w = win.width > 0 ? win.width : lastLayoutRef.current.width
      const h = win.height > 0 ? win.height : lastLayoutRef.current.height
      if (w > 0 && h > 0) lastLayoutRef.current = { width: w, height: h }
      scheduleMeasure(w, h)
    }
    topListeners.add(triggerTopMeasure)

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (!isTopSizeView(instanceId)) return
      const w = window.width > 0 ? window.width : lastLayoutRef.current.width
      const h = window.height > 0 ? window.height : lastLayoutRef.current.height
      if (w > 0 && h > 0) lastLayoutRef.current = { width: w, height: h }
      scheduleMeasure(w, h)
    })

    const unlistenDisplay = onDisplayChange(() => {
      if (!isTopSizeView(instanceId)) return
      const win = Dimensions.get('window')
      const w = win.width > 0 ? win.width : lastLayoutRef.current.width
      const h = win.height > 0 ? win.height : lastLayoutRef.current.height
      if (w > 0 && h > 0) lastLayoutRef.current = { width: w, height: h }
      scheduleMeasure(w, h)
    })

    const handleSettingUpdate = (keys: Array<keyof LX.AppSetting>) => {
      if (!isTopSizeView(instanceId)) return
      if (!keys.includes('common.alwaysKeepStatusbarHeight') || !sizeRef.current.layoutHeight) return
      const { winHeight, layoutHeight, topInsetDp, hasRootInsets } = sizeRef.current
      const height = resolveStatusbarHeight(winHeight, layoutHeight, topInsetDp, hasRootInsets)
      if (commonState.statusbarHeight != height) {
        setStatusbarHeight(height)
      }
    }
    global.state_event.on('configUpdated', handleSettingUpdate)

    return () => {
      topListeners.delete(triggerTopMeasure)
      const idx = mountedSizeViews.indexOf(instanceId)
      const wasTop = idx === mountedSizeViews.length - 1
      if (idx >= 0) mountedSizeViews.splice(idx, 1)
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      subscription.remove()
      unlistenDisplay()
      global.state_event.off('configUpdated', handleSettingUpdate)
      if (wasTop && mountedSizeViews.length > 0) {
        for (const fn of [...topListeners]) fn()
      }
    }
  }, [instanceId, scheduleMeasure])

  return (<View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={handleLayout} />)
}, () => true)
