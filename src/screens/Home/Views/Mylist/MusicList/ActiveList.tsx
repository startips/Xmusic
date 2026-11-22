import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { TouchableOpacity } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { ExpressiveButton, ExpressiveIconButton } from '@/components/common/m3e/ExpressiveButton'
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
      activeOpacity={0.78}
      style={{
        ...styles.currentList,
        opacity: visibleBar ? 1 : 0,
        backgroundColor: theme['m3-surface-container'],
      }}
    >
      <Icon style={styles.currentListIcon} color={theme['m3-on-surface-variant']} name="chevron-right" size={12} />
      {fetching ? <Loading color={theme['m3-primary']} style={styles.loading} /> : null}
      <Text style={styles.currentListText} size={14} numberOfLines={1} color={theme['m3-on-surface']}>{currentListName}</Text>
      <ExpressiveButton
        size="sm"
        variant="tonal"
        icon="leaderboard"
        iconSize={12}
        textSize={11.5}
        disabled={!visibleBar}
        onPress={onOpenStats}
        style={styles.statsPill}
      >
        {t('stats_entry_btn')}
      </ExpressiveButton>
      <ExpressiveIconButton
        size={32}
        icon="search-2"
        iconSize={14}
        disabled={!visibleBar}
        backgroundColor={theme['m3-secondary-container']}
        color={theme['m3-on-secondary-container']}
        onPress={onShowSearchBar}
      />
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
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
})
