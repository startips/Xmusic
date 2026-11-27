import { memo } from 'react'

import Section from '../../components/Section'
import IsShowKaraokeLyric from './IsShowKaraokeLyric'
import IsShowLyricTranslation from '../Player/IsShowLyricTranslation'
import IsShowLyricRoma from '../Player/IsShowLyricRoma'
import IsS2T from '../Player/IsS2T'
import { useI18n } from '@/lang'

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_lyric_play')}>
      <IsShowKaraokeLyric />
      <IsShowLyricTranslation />
      <IsShowLyricRoma />
      <IsS2T />
    </Section>
  )
})
