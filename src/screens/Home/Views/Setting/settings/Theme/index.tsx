import { memo } from 'react'

import ThemeInfo from './ThemeInfo'
import ThemeMode from './ThemeMode'
import IsDynamicBg from './IsDynamicBg'
import IsFontShadow from './IsFontShadow'

export default memo(() => {
  return (
    <>
      <ThemeInfo />
      <ThemeMode />
      <IsDynamicBg />
      <IsFontShadow />
    </>
  )
})
