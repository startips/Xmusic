import { memo } from 'react'
import { useWindowSize } from '@/utils/hooks'
import { useNavigationBarHeight, useStatusbarHeight } from '@/store/common/hook'
import { HEADER_HEIGHT } from './components/Header'
import { BTN_WIDTH } from './MoreBtn/Btn'
import { marginLeft } from './constant'
import ArtworkCard from '../components/ArtworkCard'
import { createStyle } from '@/utils/tools'

export default memo(({ componentId }: { componentId: string }) => {
  const { width: winWidth, height: winHeight } = useWindowSize()
  const statusBarHeight = useStatusbarHeight()
  const navBarHeight = useNavigationBarHeight()

  const availableHeight = Math.max(120, winHeight - statusBarHeight - HEADER_HEIGHT - Math.max(18, navBarHeight + 10))
  let imgWidth = Math.min((winWidth * 0.45 - marginLeft - BTN_WIDTH) * 0.72, availableHeight * 0.54)
  imgWidth -= imgWidth * (global.lx.fontSize - 1) * 0.3
  let contentHeight = availableHeight * 0.58
  contentHeight -= contentHeight * (global.lx.fontSize - 1) * 0.2

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
    flexShrink: 1,
    flexGrow: 0,
    overflow: 'hidden',
  },
})
