import { memo } from 'react'
import { useWindowSize } from '@/utils/hooks'
import { useNavigationBarHeight, useSafeAreaInsets } from '@/store/common/hook'
import { HEADER_HEIGHT } from './components/Header'
import { BTN_WIDTH } from './MoreBtn/Btn'
import ArtworkCard from '../components/ArtworkCard'
import { createStyle } from '@/utils/tools'

export default memo(({ componentId }: { componentId: string }) => {
  const { width: winWidth, height: winHeight } = useWindowSize()
  const safeInsets = useSafeAreaInsets()
  const navBarHeight = useNavigationBarHeight()

  const paddingTop = Math.max(8, safeInsets.top + 4)
  const paddingLeft = Math.max(14, safeInsets.left + 12)
  const paddingRight = Math.max(12, safeInsets.right + 12)
  const bottomPad = Math.max(14, Math.max(navBarHeight, safeInsets.bottom) + 8)

  const usableWidth = Math.max(240, winWidth - paddingLeft - paddingRight)
  const picAreaWidth = Math.max(96, usableWidth * 0.45 - BTN_WIDTH - 20)
  const availableHeight = Math.max(120, winHeight - paddingTop - HEADER_HEIGHT - bottomPad)

  let imgWidth = Math.min(picAreaWidth * 0.84, availableHeight * 0.56)
  imgWidth -= imgWidth * (global.lx.fontSize - 1) * 0.3
  imgWidth = Math.max(64, Math.round(imgWidth))
  let contentHeight = availableHeight * 0.60
  contentHeight -= contentHeight * (global.lx.fontSize - 1) * 0.2
  contentHeight = Math.max(80, Math.round(contentHeight))

  return (
    <ArtworkCard
      componentId={componentId}
      size={imgWidth}
      containerStyle={{ ...styles.container, height: contentHeight }}
      activeElevation={8}
      pausedElevation={2}
    />
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    paddingLeft: 12,
    overflow: 'hidden',
  },
})
