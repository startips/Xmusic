import { memo, useMemo } from 'react'

import SubTitle from '../../components/SubTitle'
import { ExpressiveButtonGroup } from '@/components/common/m3e/ExpressiveButtonGroup'
import { langList, useI18n } from '@/lang'
import { setLanguage } from '@/core/common'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const activeLangId = useSettingValue('common.langId')

  const options = useMemo(() => {
    return langList.map(({ locale, name }) => ({ id: locale, label: name }))
  }, [])

  return (
    <SubTitle title={t('setting_basic_lang')}>
      <ExpressiveButtonGroup
        size="sm"
        tone="secondary"
        containerColor={theme['m3-surface-container-high']}
        value={activeLangId ?? 'zh_cn'}
        onChange={setLanguage}
        options={options}
        style={{ maxWidth: 340, marginRight: 25 }}
      />
    </SubTitle>
  )
})
