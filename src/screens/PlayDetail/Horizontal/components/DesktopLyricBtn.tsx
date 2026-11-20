import { memo } from 'react'
import DesktopLyricEnable from '@/components/DesktopLyricEnable'
import { useDesktopLyricAction } from '../../components/actionHooks'
import Btn from './Btn'

export default memo(() => {
  const {
    enabledLyric,
    desktopLyricEnableRef,
    toggleDesktopLyric,
    toggleLock,
  } = useDesktopLyricAction()

  return (
    <>
      <Btn
        icon={enabledLyric ? 'lyric-on' : 'lyric-off'}
        active={enabledLyric}
        onPress={toggleDesktopLyric}
        onLongPress={toggleLock}
      />
      <DesktopLyricEnable ref={desktopLyricEnableRef} />
    </>
  )
})
