import { memo } from 'react'
import MusicAddModal from '@/components/MusicAddModal'
import SolidHeartIcon from '@/components/common/SolidHeartIcon'
import { useTheme } from '@/store/theme/hook'
import { useLoveMusicAction } from '../../../../components/actionHooks'
import Btn, { BTN_ICON_SIZE } from './Btn'

export default memo(() => {
  const theme = useTheme()
  const { isLoved, musicAddModalRef, handleToggleLove, handleShowMusicAddModal } = useLoveMusicAction()

  return (
    <>
      <Btn
        icon={isLoved ? undefined : 'love'}
        active={isLoved}
        hapticType={false}
        onPress={handleToggleLove}
        onLongPress={handleShowMusicAddModal}
      >
        {isLoved ? <SolidHeartIcon size={BTN_ICON_SIZE} color={theme['m3-primary']} /> : undefined}
      </Btn>
      <MusicAddModal ref={musicAddModalRef} />
    </>
  )
})
