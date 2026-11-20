import { useCallback, useEffect, useRef } from 'react'
import { useHorizontalMode } from '@/utils/hooks'
import { useBackHandler } from '@/utils/hooks/useBackHandler'

import Vertical from './Vertical'
import Horizontal from './Horizontal'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import EdgeSwipeContainer, { type EdgeSwipeContainerRef } from '@/components/common/EdgeSwipeContainer'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import { navigations } from '@/navigation'
import { registerPlayDetailMinimizePreparer } from '@/navigation/playerBarTarget'

export default ({ componentId }: { componentId: string }) => {
  const isHorizontalMode = useHorizontalMode()
  const isDismissingRef = useRef(false)
  const edgeSwipeRef = useRef<EdgeSwipeContainerRef>(null)

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
    registerPlayDetailMinimizePreparer(() => {
      edgeSwipeRef.current?.prepareMinimize()
    })
    return () => {
      registerPlayDetailMinimizePreparer(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const triggerDismiss = useCallback(() => {
    if (isDismissingRef.current) return
    isDismissingRef.current = true
    navigations.popPlayDetailScreen(componentId)
  }, [componentId])

  useBackHandler(useCallback(() => {
    if (commonState.componentIds.comment) return false
    triggerDismiss()
    return true
  }, [triggerDismiss]))

  return (
    <EdgeSwipeContainer
      ref={edgeSwipeRef}
      edgeWidth={42}
      dismissDistance={64}
      onEdgeDismiss={triggerDismiss}
      style={{ flex: 1 }}
    >
      <PageContent>
        <StatusBar />
        {
          isHorizontalMode
            ? <Horizontal componentId={componentId} />
            : <Vertical componentId={componentId} />
        }
      </PageContent>
    </EdgeSwipeContainer>
  )
}
