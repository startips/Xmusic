import { Dimensions, PixelRatio } from 'react-native'
import { windowSizeTools } from './windowSizeTools'

const designWidth = 375.0
const designHeight = 667.0

let screenW = 375
let screenH = 667
let fontScale = PixelRatio.getFontScale() || 1
let pixelRatio = PixelRatio.get() || 2
let scale = 2

const refreshMetrics = (rawSize?: { width: number, height: number }) => {
  const win = rawSize && rawSize.width > 0 && rawSize.height > 0
    ? rawSize
    : (windowSizeTools.getSize().width > 0 ? windowSizeTools.getSize() : Dimensions.get('window'))
  let w = win.width || 375
  let h = win.height || 667
  if (w > h) {
    const temp = w
    w = h
    h = temp
  }
  screenW = w
  screenH = h
  fontScale = PixelRatio.getFontScale() || 1
  pixelRatio = PixelRatio.get() || 2
  const screenPxW = PixelRatio.getPixelSizeForLayoutSize(screenW)
  const screenPxH = PixelRatio.getPixelSizeForLayoutSize(screenH)
  const scaleW = screenPxW / designWidth
  const scaleH = screenPxH / designHeight
  scale = Math.max(1, Math.min(scaleW, scaleH, 3.1))
}

refreshMetrics()
windowSizeTools.onSizeChanged((newSize) => {
  refreshMetrics(newSize)
})

export function getTextSize(size: number) {
  if (screenW <= 0) refreshMetrics()
  const scaleWidth = screenW / designWidth
  const scaleHeight = screenH / designHeight
  const textScale = Math.min(scaleWidth, scaleHeight, 1.3)
  return Math.round(((size * textScale) / fontScale) * 2) / 2
}

export function setSpText(size: number) {
  return getTextSize(size) * (global.lx?.fontSize ?? 1)
}

export function scaleSizeH(size: number) {
  if (screenW <= 0) refreshMetrics()
  const scaleHeight = size * scale
  return Math.round((scaleHeight / pixelRatio) * (global.lx?.fontSize ?? 1))
}

export function scaleSizeW(size: number) {
  if (screenW <= 0) refreshMetrics()
  const scaleWidth = size * scale
  return Math.round((scaleWidth / pixelRatio) * (global.lx?.fontSize ?? 1))
}

export const scaleSizeWR = (size: number) => {
  return size * 2 - scaleSizeW(size)
}

export const scaleSizeHR = (size: number) => {
  return size * 2 - scaleSizeH(size)
}

export const scaleSizeAbsHR = (size: number) => {
  const scaleHeight = size * scale
  return size * 2 - Math.floor(scaleHeight / pixelRatio)
}
