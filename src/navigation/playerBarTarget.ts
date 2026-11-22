export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

let playerBarPicRect: WindowRect | null = null
let minimizePreparer: (() => void) | null = null
let activePlayerBarMeasurer: (() => void) | null = null

export const setPlayerBarPicRect = (rect: WindowRect | null) => {
  if (!rect || rect.width <= 0 || rect.height <= 0) return
  playerBarPicRect = rect
}

export const getPlayerBarPicRect = (): WindowRect | null => {
  return playerBarPicRect
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
