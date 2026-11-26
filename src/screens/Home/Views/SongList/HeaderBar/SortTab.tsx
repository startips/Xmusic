import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { View } from 'react-native'
import songlistState, { type SortInfo, type Source } from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import DorpDownMenu from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { M3Radius } from '@/theme/m3'
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

  useImperativeHandle(ref, () => ({
    setSource(source, activeTab) {
      setSortList(songlistState.sortList[source] ?? [])
      setActiveId(activeTab)
    },
  }), [])

  const menus = useMemo(() => {
    return sortList.map(s => ({ label: t(`songlist_${s.tid}`), action: s.id }))
  }, [sortList, t])

  if (menus.length <= 1) return null

  const activeLabel = menus.find(m => m.action === activeId)?.label ?? menus[0]?.label ?? ''

  return (
    <DorpDownMenu
      menus={menus}
      activeId={activeId}
      center
      fontSize={13}
      onPress={({ action }) => {
        onSortChange(action)
        setActiveId(action)
      }}
    >
      <View
        style={{
          ...styles.pill,
          backgroundColor: theme['m3-surface-container'],
          borderColor: theme['m3-outline-variant'],
        }}
      >
        <Text size={13} numberOfLines={1} style={styles.label} color={theme['m3-on-surface']}>
          {activeLabel}
        </Text>
        <Icon
          name="chevron-right"
          size={10}
          color={theme['m3-on-surface-variant']}
          style={styles.caret}
        />
      </View>
    </DorpDownMenu>
  )
})

const styles = createStyle({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: M3Radius.full,
    borderWidth: 0.8,
  },
  label: {
    fontWeight: '500',
  },
  caret: {
    transform: [{ rotate: '90deg' }],
  },
})
