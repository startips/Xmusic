import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import songlistState, { type SortInfo, type Source } from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'
import { createStyle } from '@/utils/tools'

export interface SortTabProps {
  onSortChange: (id: string) => void
}

export interface SortTabType {
  setSource: (source: Source, activeTab: SortInfo['id']) => void
}

export default forwardRef<SortTabType, SortTabProps>(({ onSortChange }, ref) => {
  const [sortList, setSortList] = useState<SortInfo[]>([])
  const [activeId, setActiveId] = useState<SortInfo['id']>('')
  const t = useI18n()
  const theme = useTheme()
  const scrollViewRef = useRef<ScrollView>(null)

  useImperativeHandle(ref, () => ({
    setSource(source, activeTab) {
      scrollViewRef.current?.scrollTo({ x: 0 })
      setSortList(songlistState.sortList[source]!)
      setActiveId(activeTab)
    },
  }))

  const sorts = useMemo(() => {
    return sortList.map(s => ({ label: t(`songlist_${s.tid}`), id: s.id }))
  }, [sortList, t])

  const handleSortChange = (id: string) => {
    onSortChange(id)
    setActiveId(id)
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps={'always'}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {sorts.map(s => {
        const active = activeId == s.id
        return (
          <ExpressiveButton
            key={s.id}
            size="sm"
            variant={active ? 'secondary' : 'surface'}
            leftRadius={active ? 16 : 10}
            rightRadius={active ? 16 : 10}
            pressRadius={8}
            textSize={13}
            style={{
              backgroundColor: active ? theme['m3-secondary-container'] : theme['m3-surface-container'],
            }}
            textStyle={{
              fontWeight: active ? '600' : '400',
              color: active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant'],
            }}
            onPress={() => { handleSortChange(s.id) }}
          >
            {s.label}
          </ExpressiveButton>
        )
      })}
    </ScrollView>
  )
})

const styles = createStyle({
  container: {
    flexGrow: 1,
    flexShrink: 1,
  },
  contentContainer: {
    alignItems: 'center',
    gap: 6,
  },
})
