import { useCallback, useEffect, useRef } from 'react'

import MusicList, { type MusicListType } from './MusicList'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import EdgeSwipeContainer from '@/components/common/EdgeSwipeContainer'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import { type ListInfoItem } from '@/store/songlist/state'
import PlayerBar from '@/components/player/PlayerBar'
import { ListInfoContext } from './state'
import { pop } from '@/navigation'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import commonState from '@/store/common/state'


export default ({ componentId, info }: { componentId: string, info: ListInfoItem }) => {
  const musicListRef = useRef<MusicListType>(null)
  const isUnmountedRef = useRef(false)
  const isDismissingRef = useRef(false)

  useEffect(() => {
    setComponentId(COMPONENT_IDS.songlistDetail, componentId)

    isUnmountedRef.current = false

    musicListRef.current?.loadList(info.source, info.id)


    return () => {
      isUnmountedRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBack = useCallback(() => {
    if (isDismissingRef.current) return
    isDismissingRef.current = true
    void pop(componentId)
  }, [componentId])

  useBackHandler(useCallback(() => {
    if (Boolean(commonState.componentIds.playDetail) || Boolean(commonState.componentIds.comment)) return false
    handleBack()
    return true
  }, [handleBack]))

  return (
    <EdgeSwipeContainer
      edgeWidth={24}
      dismissDistance={64}
      onEdgeDismiss={handleBack}
      style={{ flex: 1 }}
    >
      <PageContent>
        <StatusBar />
        <ListInfoContext.Provider value={info}>
          <MusicList ref={musicListRef} componentId={componentId} />
        </ListInfoContext.Provider>
        <PlayerBar />
      </PageContent>
    </EdgeSwipeContainer>
  )
}

// const styles = createStyle({
//   container: {
//     width: '100%',
//     flex: 1,
//     flexDirection: 'row',
//     borderTopWidth: BorderWidths.normal,
//   },
//   content: {
//     flex: 1,
//   },
// })
