import { memo, useCallback, useRef, useEffect } from 'react'
import { type LayoutChangeEvent, StyleSheet, View, StatusBar, Dimensions, Keyboard } from 'react-native'
import commonState from '@/store/common/state'
import settingState from '@/store/setting/state'
import { setNavigationBarHeight, setStatusbarHeight } from '@/core/common'
import { getNavigationBarHeight } from '@/utils/nativeModules/utils'
import { windowSizeTools, getWindowSize } from '@/utils/windowSizeTools'

const getStatusbarHeight = (winHeight: number, layoutHeight: number) => {
  const height = (!settingState.setting['common.alwaysKeepStatusbarHeight'] &&
          parseFloat(winHeight.toFixed(2)) >= parseFloat(layoutHeight.toFixed(2)))
    ? 0
    : (StatusBar.currentHeight ?? 0)

  return height
}

let latestMeasureSeq = 0

export default memo(() => {
  const sizeRef = useRef([0, 0])
  const lastLayoutRef = useRef({ width: 0, height: 0 })

  const runMeasure = useCallback((layoutWidth: number, layoutHeight: number) => {
    if (layoutWidth <= 0 || layoutHeight <= 0) return
    const seq = ++latestMeasureSeq
    void Promise.all([getWindowSize(), getNavigationBarHeight()]).then(([size, navBarPx]) => {
      if (seq !== latestMeasureSeq) return
      sizeRef.current = [size.height, layoutHeight]
      const height = getStatusbarHeight(size.height, layoutHeight)

      if (commonState.statusbarHeight != height) {
        setStatusbarHeight(height)
      }
      const scale = Dimensions.get('window').scale || 1
      const navHeight = Math.round((navBarPx / scale) * 100) / 100
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

  const handleLayout = useCallback(({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (lastLayoutRef.current.width === layout.width && lastLayoutRef.current.height === layout.height) return
    lastLayoutRef.current = { width: layout.width, height: layout.height }
    runMeasure(layout.width, layout.height)
  }, [runMeasure])

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      runMeasure(lastLayoutRef.current.width || window.width, lastLayoutRef.current.height || window.height)
    })

    const handleSettingUpdate = (keys: Array<keyof LX.AppSetting>) => {
      if (!keys.includes('common.alwaysKeepStatusbarHeight') || !sizeRef.current[1]) return
      const height = getStatusbarHeight(sizeRef.current[0], sizeRef.current[1])
      if (commonState.statusbarHeight != height) {
        setStatusbarHeight(height)
      }
    }
    global.state_event.on('configUpdated', handleSettingUpdate)

    return () => {
      subscription.remove()
      global.state_event.off('configUpdated', handleSettingUpdate)
    }
  }, [runMeasure])

  return (<View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={handleLayout} />)
}, () => true)
