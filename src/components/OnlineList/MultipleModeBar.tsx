import { forwardRef, useImperativeHandle, useRef } from 'react'
import MultiSelectBar, { type MultiSelectBarType, type SelectMode } from '@/components/common/MultiSelectBar'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'

export type { SelectMode }

export const MULTI_SELECT_BAR_HEIGHT = scaleSizeH(44)
export const MULTI_SELECT_BAR_OFFSET = MULTI_SELECT_BAR_HEIGHT + scaleSizeH(12)

export interface MultipleModeBarProps {
  onSwitchMode: (mode: SelectMode) => void
  onSelectAll: (isAll: boolean) => void
  onExitSelectMode: () => void
  onPlayLater?: () => void
  onAdd?: () => void
}

export interface MultipleModeBarType {
  show: () => void
  setIsSelectAll: (isAll: boolean) => void
  setSwitchMode: (mode: SelectMode) => void
  exitSelectMode: () => void
}

export default forwardRef<MultipleModeBarType, MultipleModeBarProps>((props, ref) => {
  const barRef = useRef<MultiSelectBarType>(null)

  useImperativeHandle(ref, () => ({
    show() {
      barRef.current?.show()
    },
    setIsSelectAll(isAll) {
      barRef.current?.setIsSelectAll(isAll)
    },
    setSwitchMode(mode) {
      barRef.current?.setSwitchMode(mode)
    },
    exitSelectMode() {
      barRef.current?.exitSelectMode()
    },
  }))

  return (
    <MultiSelectBar
      ref={barRef}
      slideFrom={20}
      wrapperStyle={styles.wrapper}
      barStyle={styles.bar}
      {...props}
    />
  )
})

const styles = createStyle({
  wrapper: {
    bottom: 0,
  },
  bar: {
    marginHorizontal: 12,
    marginBottom: 8,
    height: MULTI_SELECT_BAR_HEIGHT,
  },
})
