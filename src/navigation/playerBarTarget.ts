import { windowSizeTools } from '@/utils/windowSizeTools'

export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

interface StoredTargetRect {
  rect: WindowRect
  winWidth: number
  winHeight: number
}

let playerBarPicTarget: StoredTargetRect | null = null
let minimizePreparer: (() => void) | null = null
let activePlayerBarMeasurer: (() => void) | null = null
let activePlayerBarBouncer: (() => void) | null = null

const isValidPlayerBarRect = (rect: WindowRect, winW: number, winH: number): boolean => {
  if (winW <= 0 || winH <= 0) return false
  if (rect.width <= 12 || rect.height <= 12 || rect.width > 120 || rect.height > 120) return false
  if (rect.x < 0 || rect.x + rect.width > winW + 24) return false
  const minY = Math.max(120, winH * 0.52)
  if (rect.y < minY || rect.y + rect.height > winH + 24) return false
  return true
}

export const setPlayerBarPicRect = (rect: WindowRect | null) => {
  if (!rect) return
  const win = windowSizeTools.getSize()
  if (!isValidPlayerBarRect(rect, win.width, win.height)) return
  playerBarPicTarget = {
    rect,
    winWidth: win.width,
    winHeight: win.height,
  }
}

export const getPlayerBarPicRect = (expectedWidth?: number, expectedHeight?: number): WindowRect | null => {
  if (!playerBarPicTarget) return null
  if (
    expectedWidth != null &&
    expectedHeight != null &&
    playerBarPicTarget.winWidth > 0 &&
    playerBarPicTarget.winHeight > 0 &&
    (Math.abs(playerBarPicTarget.winWidth - expectedWidth) > 24 ||
      Math.abs(playerBarPicTarget.winHeight - expectedHeight) > 24)
  ) {
    return null
  }
  const refW = expectedWidth ?? playerBarPicTarget.winWidth
  const refH = expectedHeight ?? playerBarPicTarget.winHeight
  if (!isValidPlayerBarRect(playerBarPicTarget.rect, refW, refH)) return null
  return playerBarPicTarget.rect
}

export const registerActivePlayerBarMeasurer = (fn: (() => void) | null) => {
  activePlayerBarMeasurer = fn
}

export const unregisterActivePlayerBarMeasurer = (fn: () => void) => {
  if (activePlayerBarMeasurer === fn) activePlayerBarMeasurer = null
}

export const measureActivePlayerBarPic = () => {
  activePlayerBarMeasurer?.()
}

export const registerActivePlayerBarBouncer = (fn: (() => void) | null) => {
  activePlayerBarBouncer = fn
}

export const unregisterActivePlayerBarBouncer = (fn: () => void) => {
  if (activePlayerBarBouncer === fn) activePlayerBarBouncer = null
}

export const triggerActivePlayerBarBounce = () => {
  activePlayerBarBouncer?.()
}

export const registerPlayDetailMinimizePreparer = (fn: (() => void) | null) => {
  minimizePreparer = fn
}

export const preparePlayDetailMinimize = () => {
  minimizePreparer?.()
}
