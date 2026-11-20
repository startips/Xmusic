import { memo } from 'react'
import { usePlayModeAction } from '../../components/actionHooks'
import Btn from './Btn'

export default memo(() => {
  const { playModeIcon, toggleNextPlayMode } = usePlayModeAction()
  return <Btn icon={playModeIcon} onPress={toggleNextPlayMode} />
})
