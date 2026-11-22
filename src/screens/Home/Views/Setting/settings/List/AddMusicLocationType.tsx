import { memo, useMemo } from 'react'

import SubTitle from '../../components/SubTitle'
import { ExpressiveButtonGroup } from '@/components/common/m3e/ExpressiveButtonGroup'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { useTheme } from '@/store/theme/hook'

const setAddMusicLocationType = (type: LX.AddMusicLocationType) => {
  updateSetting({ 'list.addMusicLocationType': type })
}

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const addMusicLocationType = useSettingValue('list.addMusicLocationType')

  const options = useMemo<Array<{ id: LX.AddMusicLocationType, label: string }>>(() => ([
    { id: 'top', label: t('setting_list_add_music_location_type_top') },
    { id: 'bottom', label: t('setting_list_add_music_location_type_bottom') },
  ]), [t])

  return (
    <SubTitle title={t('setting_list_add_music_location_type')}>
      <ExpressiveButtonGroup
        size="sm"
        tone="secondary"
        containerColor={theme['m3-surface-container-high']}
        value={addMusicLocationType}
        onChange={setAddMusicLocationType}
        options={options}
        style={{ maxWidth: 260, marginRight: 25 }}
      />
    </SubTitle>
  )
})
