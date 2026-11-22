import { memo, useMemo } from 'react'

import SubTitle from '../../components/SubTitle'
import { ExpressiveButtonGroup } from '@/components/common/m3e/ExpressiveButtonGroup'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { setDesktopLyricTextPosition } from '@/core/desktopLyric'
import { updateSetting } from '@/core/common'
import { useTheme } from '@/store/theme/hook'

type X_TYPE = LX.AppSetting['desktopLyric.textPosition.x']

const X_LIST = [
  'left',
  'center',
  'right',
] as const

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const x = useSettingValue('desktopLyric.textPosition.x')

  const options = useMemo(() => {
    return X_LIST.map(id => ({ id, label: t(`setting_lyric_desktop_text_x_${id}`) }))
  }, [t])

  const setPosition = (id: X_TYPE) => {
    void setDesktopLyricTextPosition(id, null).then(() => {
      updateSetting({ 'desktopLyric.textPosition.x': id })
    })
  }

  return (
    <SubTitle title={t('setting_lyric_desktop_text_x')}>
      <ExpressiveButtonGroup
        size="sm"
        tone="secondary"
        containerColor={theme['m3-surface-container-high']}
        value={x}
        onChange={setPosition}
        options={options}
        style={{ maxWidth: 320, marginRight: 25 }}
      />
    </SubTitle>
  )
})
