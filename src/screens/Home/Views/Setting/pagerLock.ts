type PagerLockListener = (locked: boolean) => void

let listener: PagerLockListener | null = null

export const registerSettingPagerLock = (fn: PagerLockListener | null) => {
  listener = fn
}

export const setSettingPagerLocked = (locked: boolean) => {
  listener?.(locked)
}
