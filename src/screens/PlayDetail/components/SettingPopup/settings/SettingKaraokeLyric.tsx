import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import CheckBox from '@/components/common/CheckBox'
import styles from './style'

export default () => {
  const t = useI18n()
  const isShowKaraokeLyric = useSettingValue('playDetail.isShowKaraokeLyric')
  const setShowKaraokeLyric = (val: boolean) => {
    updateSetting({ 'playDetail.isShowKaraokeLyric': val })
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.content}>
          <CheckBox
            marginBottom={3}
            check={isShowKaraokeLyric}
            label={t('play_detail_setting_show_karaoke_lyric')}
            onChange={setShowKaraokeLyric}
          />
        </View>
      </View>
    </View>
  )
}
