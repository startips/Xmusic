import { useCallback, useMemo, useRef } from 'react'
import { MUSIC_TOGGLE_MODE, MUSIC_TOGGLE_MODE_LIST } from '@/config/constant'
import { updateSetting } from '@/core/common'
import { toggleDesktopLyricLock } from '@/core/desktopLyric'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { useIsMusicInLoveList } from '@/store/list/hook'
import { usePlayMusicInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import settingState from '@/store/setting/state'
import { type DesktopLyricEnableType } from '@/components/DesktopLyricEnable'
import { type MusicAddModalType } from '@/components/MusicAddModal'

export const useDesktopLyricAction = () => {
  const enabledLyric = useSettingValue('desktopLyric.enable')
  const desktopLyricEnableRef = useRef<DesktopLyricEnableType>(null)

  const toggleDesktopLyric = useCallback(() => {
    desktopLyricEnableRef.current?.setEnabled(!enabledLyric)
  }, [enabledLyric])

  const toggleLock = useCallback(() => {
    const isLock = !settingState.setting['desktopLyric.isLock']
    void toggleDesktopLyricLock(isLock).then(() => {
      updateSetting({ 'desktopLyric.isLock': isLock })
    })
  }, [])

  return {
    enabledLyric,
    desktopLyricEnableRef,
    toggleDesktopLyric,
    toggleLock,
  }
}

export const useLoveMusicAction = () => {
  const playMusicInfo = usePlayMusicInfo()
  const musicAddModalRef = useRef<MusicAddModalType>(null)

  const targetMusicInfo = useMemo(() => {
    const info = playMusicInfo.musicInfo
    if (!info) return null
    return 'progress' in info ? info.metadata.musicInfo : info
  }, [playMusicInfo.musicInfo])

  const isLoved = useIsMusicInLoveList(targetMusicInfo?.id)

  const handleShowMusicAddModal = useCallback(() => {
    if (!targetMusicInfo) return
    musicAddModalRef.current?.show({
      musicInfo: targetMusicInfo,
      isMove: false,
      listId: playMusicInfo.listId!,
    })
  }, [playMusicInfo.listId, targetMusicInfo])

  return {
    isLoved,
    musicAddModalRef,
    handleShowMusicAddModal,
  }
}

type PlayMode = (typeof MUSIC_TOGGLE_MODE_LIST)[number]

const MODE_ICON_MAP: Record<PlayMode, string> = {
  [MUSIC_TOGGLE_MODE.listLoop]: 'list-loop',
  [MUSIC_TOGGLE_MODE.random]: 'list-random',
  [MUSIC_TOGGLE_MODE.list]: 'list-order',
  [MUSIC_TOGGLE_MODE.singleLoop]: 'single-loop',
  [MUSIC_TOGGLE_MODE.none]: 'single',
}

export const usePlayModeAction = () => {
  const togglePlayMethod = useSettingValue('player.togglePlayMethod')

  const toggleNextPlayMode = useCallback(() => {
    let index = MUSIC_TOGGLE_MODE_LIST.indexOf(togglePlayMethod)
    if (++index >= MUSIC_TOGGLE_MODE_LIST.length) index = 0
    const mode = MUSIC_TOGGLE_MODE_LIST[index]
    updateSetting({ 'player.togglePlayMethod': mode })
  }, [togglePlayMethod])

  const playModeIcon = useMemo(
    () => MODE_ICON_MAP[togglePlayMethod] ?? 'single',
    [togglePlayMethod],
  )

  return {
    playModeIcon,
    toggleNextPlayMode,
  }
}

export const useCommentAction = () => {
  return useCallback(() => {
    navigations.pushCommentScreen(commonState.componentIds.playDetail!)
  }, [])
}
