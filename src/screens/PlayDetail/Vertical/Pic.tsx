import { useMemo } from 'react'
import { useWindowSize } from '@/utils/hooks'
import { useStatusbarHeight } from '@/store/common/hook'
import { HEADER_HEIGHT } from './components/Header'
import ArtworkCard from '../components/ArtworkCard'

export default ({ componentId }: { componentId: string }) => {
  const { width: winWidth, height: winHeight } = useWindowSize()
  const statusBarHeight = useStatusbarHeight()

  const size = useMemo(() => {
    return Math.min(winWidth * 0.82, (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.48)
  }, [statusBarHeight, winHeight, winWidth])

  return (
    <ArtworkCard
      componentId={componentId}
      size={size}
      activeElevation={10}
      pausedElevation={3}
    />
  )
}
