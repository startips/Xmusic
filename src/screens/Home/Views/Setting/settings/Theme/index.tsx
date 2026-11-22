import { memo } from 'react'

import ThemeInfo from './ThemeInfo'
import ThemeMode from './ThemeMode'
import IsDynamicCoverColor from './IsDynamicCoverColor'
import IsDynamicBg from './IsDynamicBg'

export default memo(() => {
  return (
    <>
      <ThemeInfo />
      <ThemeMode />
      <IsDynamicCoverColor />
      <IsDynamicBg />
    </>
  )
})
