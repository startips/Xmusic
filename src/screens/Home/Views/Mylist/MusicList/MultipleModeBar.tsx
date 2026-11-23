import { forwardRef } from 'react'
import MultiSelectBar, { type MultiSelectBarType, type SelectMode } from '@/components/common/MultiSelectBar'
import { createStyle } from '@/utils/tools'

export type { SelectMode }
export type MultipleModeBarType = MultiSelectBarType

export interface MultipleModeBarProps {
  onSwitchMode: (mode: SelectMode) => void
  onSelectAll: (isAll: boolean) => void
  onExitSelectMode: () => void
  onPlayLater?: () => void
  onAdd?: () => void
  onRemove?: () => void
}

export default forwardRef<MultipleModeBarType, MultipleModeBarProps>((props, ref) => {
  return (
    <MultiSelectBar
      ref={ref}
      slideFrom={-18}
      activeTabId="nav_love"
      wrapperStyle={styles.wrapper}
      barStyle={styles.bar}
      {...props}
    />
  )
})

const styles = createStyle({
  wrapper: {
    top: 0,
  },
  bar: {
    marginHorizontal: 14,
    marginTop: 4,
    height: 42,
  },
})
