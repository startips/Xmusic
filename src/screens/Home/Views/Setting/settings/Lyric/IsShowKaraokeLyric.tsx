import { memo } from 'react'
import { View } from 'react-native'

import CheckBoxItem from '../../components/CheckBoxItem'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const isShowKaraokeLyric = useSettingValue('playDetail.isShowKaraokeLyric')
  const setIsShowKaraokeLyric = (val: boolean) => {
    updateSetting({ 'playDetail.isShowKaraokeLyric': val })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isShowKaraokeLyric}
        label={t('setting_lyric_karaoke_dof')}
        onChange={setIsShowKaraokeLyric}
      />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
