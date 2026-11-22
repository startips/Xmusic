import { memo } from 'react'
import { View } from 'react-native'

import CheckBoxItem from '../../components/CheckBoxItem'
import { createStyle } from '@/utils/tools'
import { hapticTick } from '@/utils/haptics'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { useSettingValue } from '@/store/setting/hook'

export default memo(() => {
  const t = useI18n()
  const isDynamicCoverColor = useSettingValue('theme.dynamicCoverColor')
  const setIsDynamicCoverColor = (val: boolean) => {
    hapticTick()
    updateSetting({ 'theme.dynamicCoverColor': val })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={isDynamicCoverColor}
        label={t('setting_basic_theme_dynamic_cover_color')}
        onChange={setIsDynamicCoverColor}
      />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
