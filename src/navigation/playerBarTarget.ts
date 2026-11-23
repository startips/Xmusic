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

export const setPlayerBarPicRect = (rect: WindowRect | null) => {
  if (!rect || rect.width <= 0 || rect.height <= 0) return
  const win = windowSizeTools.getSize()
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
  return playerBarPicTarget.rect
}

export const registerActivePlayerBarMeasurer = (fn: (() => void) | null) => {
  activePlayerBarMeasurer = fn
}

export const measureActivePlayerBarPic = () => {
  activePlayerBarMeasurer?.()
}

export const registerPlayDetailMinimizePreparer = (fn: (() => void) | null) => {
  minimizePreparer = fn
}

export const preparePlayDetailMinimize = () => {
  minimizePreparer?.()
}
