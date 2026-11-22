import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { TouchableOpacity } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'
import { useActiveListId, useListFetching } from '@/store/list/hook'
import listState from '@/store/list/state'
import { createStyle } from '@/utils/tools'
import { getListPrevSelectId } from '@/utils/data'
import { setActiveList } from '@/core/list'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import Loading from '@/components/common/Loading'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { hapticLight } from '@/utils/haptics'

export interface ActiveListProps {
  onShowSearchBar: () => void
  onScrollToTop: () => void
  onOpenStats: () => void
}
export interface ActiveListType {
  setVisibleBar: (visible: boolean) => void
}

export default forwardRef<ActiveListType, ActiveListProps>(({ onShowSearchBar, onScrollToTop, onOpenStats }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const currentListId = useActiveListId()
  const fetching = useListFetching(currentListId)
  const langId = useSettingValue('common.langId')
  const currentListName = useMemo(() => {
    switch (currentListId) {
      case LIST_IDS.TEMP:
        return global.i18n.t('list_name_temp')
      case LIST_IDS.DEFAULT:
        return global.i18n.t('list_name_default')
      case LIST_IDS.LOVE:
        return global.i18n.t('list_name_love')
      default:
        return listState.allList.find(l => l.id === currentListId)?.name ?? ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListId, langId])
  const [visibleBar, setVisibleBar] = useState(true)

  useImperativeHandle(ref, () => ({
    setVisibleBar(visible) {
      setVisibleBar(visible)
    },
  }))

  const showList = () => {
    global.app_event.changeLoveListVisible(true)
  }

  useEffect(() => {
    void getListPrevSelectId().then((id) => {
      setActiveList(id)
    })
  }, [])

  return (
    <TouchableOpacity
      onPress={showList}
      onLongPress={onScrollToTop}
      disabled={!visibleBar}
      activeOpacity={0.75}
      style={{
        ...styles.currentList,
        opacity: visibleBar ? 1 : 0,
        backgroundColor: theme['m3-surface-container'],
        borderColor: theme['m3-outline-variant'],
      }}
    >
      <Icon style={styles.currentListIcon} color={theme['m3-on-surface-variant']} name="chevron-right" size={12} />
      { fetching ? <Loading color={theme['m3-primary']} style={styles.loading} /> : null }
      <Text style={styles.currentListText} size={14} numberOfLines={1} color={theme['m3-on-surface']}>{currentListName}</Text>
      <TouchableOpacity
        disabled={!visibleBar}
        style={{ ...styles.statsPill, backgroundColor: theme['m3-primary-container'] }}
        onPress={() => {
          hapticLight()
          onOpenStats()
        }}
      >
        <Icon color={theme['m3-on-primary-container']} name="leaderboard" size={12} />
        <Text size={11.5} color={theme['m3-on-primary-container']} style={styles.statsPillText}>
          {t('stats_entry_btn')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={!visibleBar} style={{ ...styles.currentListBtns, backgroundColor: theme['m3-secondary-container'] }} onPress={onShowSearchBar}>
        <Icon color={theme['m3-on-secondary-container']} name="search-2" size={14} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
})


const styles = createStyle({
  currentList: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 14,
    paddingRight: 5,
    height: 42,
    borderRadius: M3Radius.full,
    borderWidth: 0.8,
    alignItems: 'center',
  },
  currentListIcon: {
    paddingRight: 8,
  },
  currentListText: {
    flex: 1,
    paddingRight: 10,
    fontWeight: '600',
  },
  loading: {
    marginRight: 5,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    marginRight: 6,
    borderRadius: M3Radius.full,
  },
  statsPillText: {
    fontWeight: '700',
  },
  currentListBtns: {
    width: 32,
    height: 32,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
