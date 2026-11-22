import { forwardRef, memo, useImperativeHandle, useState } from 'react'

import Basic from './settings/Basic'
import Player from './settings/Player'
import Lyric from './settings/Lyric'
import List from './settings/List'
import Sync from './settings/Sync'
import Backup from './settings/Backup'
import Other from './settings/Other'
import Version from './settings/Version'
import About from './settings/About'

export const SETTING_SCREENS = [
  'basic',
  'player',
  'lyric',
  'list',
  'sync_backup',
  'about',
] as const

export type SettingScreenIds = typeof SETTING_SCREENS[number]

export const normalizeSettingScreenId = (id?: string): SettingScreenIds => {
  if (id && (SETTING_SCREENS as readonly string[]).includes(id)) {
    return id as SettingScreenIds
  }
  return 'basic'
}

export const SettingGroupContent = memo(({ id }: { id: SettingScreenIds }) => {
  switch (id) {
    case 'player':
      return <Player />
    case 'lyric':
      return <Lyric />
    case 'list':
      return <List />
    case 'sync_backup':
      return (
        <>
          <Sync />
          <Backup />
        </>
      )
    case 'about':
      return (
        <>
          <Version />
          <Other />
          <About />
        </>
      )
    case 'basic':
    default:
      return <Basic />
  }
})

export interface MainType {
  setActiveId: (id: SettingScreenIds) => void
}

const Main = forwardRef<MainType, {}>((props, ref) => {
  const [id, setId] = useState<SettingScreenIds>(() => normalizeSettingScreenId(global.lx.settingActiveId))

  useImperativeHandle(ref, () => ({
    setActiveId(nextId) {
      requestAnimationFrame(() => {
        setId(nextId)
      })
    },
  }))

  return <SettingGroupContent id={id} />
})

export default Main
