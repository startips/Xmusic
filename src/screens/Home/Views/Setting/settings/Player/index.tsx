import { memo } from 'react'

import Section from '../../components/Section'
import IsSavePlayTime from './IsSavePlayTime'
import PlayHighQuality from './PlayHighQuality'
import IsHandleAudioFocus from './IsHandleAudioFocus'
import IsEnableAudioOffload from './IsEnableAudioOffload'
import IsAutoCleanPlayedList from './IsAutoCleanPlayedList'
import IsShowBluetoothLyric from './IsShowBluetoothLyric'
import IsShowBluetoothFullLyric from './IsShowBluetoothFullLyric'
import IsShowNotificationImage from './IsShowNotificationImage'
import MaxCache from './MaxCache'
import AudioEnhance from './AudioEnhance'
import { useI18n } from '@/lang'


export default memo(() => {
  const t = useI18n()

  return (
    <>
      <AudioEnhance />
      <Section title={t('setting_player')}>
        <PlayHighQuality />
        <IsSavePlayTime />
        <IsAutoCleanPlayedList />
        <IsHandleAudioFocus />
        <IsEnableAudioOffload />
        <IsShowNotificationImage />
        <IsShowBluetoothLyric />
        <IsShowBluetoothFullLyric />
        <MaxCache />
      </Section>
    </>
  )
})
