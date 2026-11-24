import { useEffect, useMemo, useState } from 'react'

import { type SearchType } from '@/store/search/state'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useWindowSize } from '@/utils/hooks'
import { getSearchSetting } from '@/utils/data'
import { ExpressiveButtonGroup } from '@/components/common/m3e/ExpressiveButtonGroup'

const SEARCH_TYPE_LIST = [
  'music',
  'songlist',
] as const

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const windowSize = useWindowSize()
  const [type, setType] = useState<SearchType>('music')

  useEffect(() => {
    void getSearchSetting().then(info => {
      setType(info.type)
    })
  }, [])

  const options = useMemo(() => {
    return SEARCH_TYPE_LIST.map(id => ({ label: t(`search_type_${id}`), id }))
  }, [t])

  const minWidth = useMemo(() => {
    const maxChars = Math.max(...options.map(o => o.label.length))
    if (maxChars < 5) return 128
    const widthScale = Math.min(Math.max(windowSize.width / 375, 0.85), 1.25)
    return Math.round(168 * widthScale)
  }, [options, windowSize.width])

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
      style={{ minWidth }}
    />
  )
}
