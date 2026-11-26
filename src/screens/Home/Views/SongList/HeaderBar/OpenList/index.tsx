import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import Modal, { type ModalType } from './Modal'
import { type Source } from '@/store/songlist/state'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'

export interface OpenListType {
  setInfo: (source: Source) => void
}

export default forwardRef<OpenListType, {}>((_props, ref) => {
  const modalRef = useRef<ModalType>(null)
  const songlistInfoRef = useRef<{ source: Source }>({ source: 'kw' })

  useEffect(() => {
    const handleShowModal = () => {
      modalRef.current?.show(songlistInfoRef.current.source)
    }
    global.app_event.on('showOpenSonglistModal', handleShowModal)
    return () => {
      global.app_event.off('showOpenSonglistModal', handleShowModal)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    setInfo(source) {
      songlistInfoRef.current.source = source
    },
  }))

  const handleOpenSonglist = (id: string) => {
    navigations.pushSonglistDetailScreen(commonState.componentIds.home!, {
      play_count: undefined,
      id,
      author: '',
      name: '',
      img: undefined,
      desc: undefined,
      source: songlistInfoRef.current.source,
    })
  }

  return <Modal ref={modalRef} onOpenId={handleOpenSonglist} />
})
