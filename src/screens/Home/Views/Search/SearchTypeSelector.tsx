import { useEffect, useMemo, useState } from 'react'

import { type SearchType } from '@/store/search/state'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { getSearchSetting } from '@/utils/data'
import { ExpressiveButtonGroup } from '@/components/common/m3e/ExpressiveButtonGroup'

const SEARCH_TYPE_LIST = [
  'music',
  'songlist',
] as const

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const [type, setType] = useState<SearchType>('music')

  useEffect(() => {
    void getSearchSetting().then(info => {
      setType(info.type)
    })
  }, [])

  const options = useMemo(() => {
    return SEARCH_TYPE_LIST.map(id => ({ label: t(`search_type_${id}`), id }))
  }, [t])

  const handleTypeChange = (nextType: SearchType) => {
    setType(nextType)
    global.app_event.searchTypeChanged(nextType)
  }

  return (
    <ExpressiveButtonGroup
      size="sm"
      tone="secondary"
      containerColor={theme['m3-surface-container']}
      value={type}
      onChange={handleTypeChange}
      options={options}
      style={{ minWidth: 124 }}
    />
  )
}
