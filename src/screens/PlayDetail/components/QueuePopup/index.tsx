import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { FlatList, ScrollView, TouchableOpacity, View, type FlatListProps } from 'react-native'

import Popup, { type PopupProps, type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { LIST_IDS } from '@/config/constant'
import { removeListMusics } from '@/core/list'
import { getList } from '@/core/player/playInfo'
import { jumpToQueueIndex, playTempPlayListIndex } from '@/core/player/player'
import { addTempPlayList, clearTempPlayeList, promoteTempPlayList, removeTempPlayList } from '@/core/player/tempPlayList'
import { useI18n } from '@/lang'
import listState from '@/store/list/state'
import { useIsPlay, usePlayInfo, usePlayMusicInfo, useTempPlayList } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { M3Radius, withAlpha } from '@/theme/m3'
import { hapticConfirm, hapticLight, hapticTick } from '@/utils/haptics'
import { scaleSizeH } from '@/utils/pixelRatio'
import { createStyle, toast } from '@/utils/tools'
import { usePlayModeAction } from '../actionHooks'

const ITEM_HEIGHT = scaleSizeH(54)

const unwrapMusicInfo = (item: LX.Music.MusicInfo | LX.Download.ListItem): LX.Music.MusicInfo => {
  return 'progress' in item ? item.metadata.musicInfo : item
}

export interface QueuePopupType {
  show: () => void
}

export interface QueuePopupProps extends Omit<PopupProps, 'children'> {}

const TempQueueRow = memo(({
  item,
  index,
  onPlayNow,
  onPromote,
  onRemove,
}: {
  item: LX.Player.PlayMusicInfo
  index: number
  onPlayNow: (index: number) => void
  onPromote: (index: number) => void
  onRemove: (index: number) => void
}) => {
  const theme = useTheme()
  const info = unwrapMusicInfo(item.musicInfo)

  return (
    <TouchableOpacity
      activeOpacity={0.72}
      style={{
        ...styles.tempRow,
        backgroundColor: withAlpha(theme['m3-primary-container'], 0.34),
        borderColor: withAlpha(theme['m3-primary'], 0.28),
      }}
      onPress={() => { onPlayNow(index) }}
    >
      <View style={{ ...styles.nextBadge, backgroundColor: theme['m3-primary'] }}>
        <Text size={10} color={theme['m3-on-primary']} style={styles.nextBadgeText}>
          {index == 0 ? 'NEXT' : `+${index + 1}`}
        </Text>
      </View>
      <View style={styles.rowTextWrap}>
        <Text size={13.5} numberOfLines={1} color={theme['m3-on-surface']} style={styles.songTitle}>
          {info.name}
        </Text>
        <Text size={11.5} numberOfLines={1} color={theme['m3-on-surface-variant']}>
          {info.singer}
        </Text>
      </View>
      {index > 0
        ? (
            <TouchableOpacity
              hitSlop={8}
              style={styles.iconAction}
              onPress={() => { onPromote(index) }}
            >
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <Icon name="chevron-left" size={14} color={theme['m3-on-surface-variant']} />
              </View>
            </TouchableOpacity>
          )
        : null}
      <TouchableOpacity
        hitSlop={8}
        style={styles.iconAction}
        onPress={() => { onRemove(index) }}
      >
        <Icon name="close" size={14} color={theme['m3-on-surface-variant']} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
})

const QueueRow = memo(({
  item,
  index,
  isActive,
  isPlay,
  canRemove,
  onPlayIndex,
  onPlayLater,
  onRemoveItem,
}: {
  item: LX.Music.MusicInfo
  index: number
  isActive: boolean
  isPlay: boolean
  canRemove: boolean
  onPlayIndex: (index: number) => void
  onPlayLater: (item: LX.Music.MusicInfo) => void
  onRemoveItem: (item: LX.Music.MusicInfo) => void
}) => {
  const theme = useTheme()

  return (
    <TouchableOpacity
      activeOpacity={0.72}
      onPress={() => { onPlayIndex(index) }}
      style={{
        ...styles.queueRow,
        height: ITEM_HEIGHT,
        backgroundColor: isActive ? withAlpha(theme['m3-secondary-container'], 0.88) : 'transparent',
      }}
    >
      <View style={styles.indexCol}>
        {isActive
          ? (
              <Icon
                name={isPlay ? 'play' : 'pause'}
                size={14}
                color={theme['m3-primary']}
              />
            )
          : (
              <Text size={12} color={theme['m3-on-surface-variant']} style={styles.indexText}>
                {index + 1}
              </Text>
            )}
      </View>
      <View style={styles.rowTextWrap}>
        <Text
          size={14}
          numberOfLines={1}
          color={isActive ? theme['m3-primary'] : theme['m3-on-surface']}
          style={isActive ? styles.songTitleActive : styles.songTitle}
        >
          {item.name}
        </Text>
        <Text size={11.5} numberOfLines={1} color={theme['m3-on-surface-variant']}>
          {item.singer}
          {item.interval ? ` · ${item.interval}` : ''}
        </Text>
      </View>
      {!isActive
        ? (
            <TouchableOpacity
              hitSlop={2}
              style={styles.iconAction}
              onPress={() => { onPlayLater(item) }}
            >
              <Icon name="add-music" size={15} color={theme['m3-on-surface-variant']} />
            </TouchableOpacity>
          )
        : null}
      {canRemove
        ? (
            <TouchableOpacity
              hitSlop={2}
              style={styles.iconAction}
              onPress={() => { onRemoveItem(item) }}
            >
              <Icon name="close" size={14} color={theme['m3-on-surface-variant']} />
            </TouchableOpacity>
          )
        : null}
    </TouchableOpacity>
  )
}, (prev, next) => (
  prev.item === next.item &&
  prev.index === next.index &&
  prev.isActive === next.isActive &&
  prev.isPlay === next.isPlay &&
  prev.canRemove === next.canRemove
))

const QueueBody = () => {
  const t = useI18n()
  const theme = useTheme()
  const playInfo = usePlayInfo()
  const playMusicInfo = usePlayMusicInfo()
  const isPlay = useIsPlay()
  const tempPlayList = useTempPlayList()
  const togglePlayMethod = useSettingValue('player.togglePlayMethod')
  const { playModeIcon, toggleNextPlayMode } = usePlayModeAction()
  const flatListRef = useRef<FlatList<LX.Music.MusicInfo>>(null)
  const [queueList, setQueueList] = useState<LX.Music.MusicInfo[]>([])

  const listId = playInfo.playerListId ?? playMusicInfo.listId

  const refreshQueue = useCallback(() => {
    if (!listId) {
      setQueueList([])
      return
    }
    const raw = getList(listId)
    setQueueList((raw as Array<LX.Music.MusicInfo | LX.Download.ListItem>).map(unwrapMusicInfo))
  }, [listId])

  useEffect(() => {
    refreshQueue()
    const handleListUpdate = (ids: string[]) => {
      if (listId && ids.includes(listId)) refreshQueue()
    }
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [listId, refreshQueue])

  const activeIndex = useMemo(() => {
    if (!playMusicInfo.musicInfo || playMusicInfo.isTempPlay) {
      return playInfo.playerPlayIndex
    }
    return playInfo.playIndex >= 0 ? playInfo.playIndex : playInfo.playerPlayIndex
  }, [playInfo.playIndex, playInfo.playerPlayIndex, playMusicInfo.isTempPlay, playMusicInfo.musicInfo])

  const scrollToActive = useCallback((animated = true) => {
    if (activeIndex < 0 || activeIndex >= queueList.length) return
    try {
      flatListRef.current?.scrollToIndex({
        index: activeIndex,
        viewPosition: 0.25,
        animated,
      })
    } catch {}
  }, [activeIndex, queueList.length])

  useEffect(() => {
    if (activeIndex < 0 || !queueList.length) return
    const timer = setTimeout(() => {
      scrollToActive(false)
    }, 80)
    return () => { clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, queueList.length > 0])

  const listTitle = useMemo(() => {
    if (!listId) return t('queue_empty_list')
    if (listId == LIST_IDS.DEFAULT) return t('list_name_default')
    if (listId == LIST_IDS.LOVE) return t('list_name_love')
    if (listId == LIST_IDS.TEMP) return t('list_name_temp')
    return listState.userList.find(l => l.id == listId)?.name ?? listId
  }, [listId, t])

  const canRemove = Boolean(listId && listId != LIST_IDS.DOWNLOAD && listId != LIST_IDS.TEMP)

  const handlePlayIndex = useCallback((index: number) => {
    if (!listId) return
    hapticLight()
    void jumpToQueueIndex(listId, index)
  }, [listId])

  const handlePlayLater = useCallback((item: LX.Music.MusicInfo) => {
    hapticConfirm()
    addTempPlayList([{ listId: listId ?? LIST_IDS.PLAY_LATER, musicInfo: item, isTop: true }])
    toast(t('queue_added_next'))
  }, [listId, t])

  const handleRemoveItem = useCallback((item: LX.Music.MusicInfo) => {
    if (!listId) return
    hapticTick()
    void removeListMusics(listId, [item.id])
  }, [listId])

  const handlePlayTempNow = useCallback((index: number) => {
    hapticLight()
    void playTempPlayListIndex(index)
  }, [])

  const handlePromoteTemp = useCallback((index: number) => {
    hapticTick()
    promoteTempPlayList(index)
  }, [])

  const handleRemoveTemp = useCallback((index: number) => {
    hapticTick()
    removeTempPlayList(index)
  }, [])

  const handleClearTemp = useCallback(() => {
    hapticConfirm()
    clearTempPlayeList()
  }, [])

  const renderItem = useCallback<NonNullable<FlatListProps<LX.Music.MusicInfo>['renderItem']>>(({ item, index }) => (
    <QueueRow
      item={item}
      index={index}
      isActive={index == activeIndex && !playMusicInfo.isTempPlay}
      isPlay={isPlay}
      canRemove={canRemove}
      onPlayIndex={handlePlayIndex}
      onPlayLater={handlePlayLater}
      onRemoveItem={handleRemoveItem}
    />
  ), [activeIndex, canRemove, handlePlayIndex, handlePlayLater, handleRemoveItem, isPlay, playMusicInfo.isTempPlay])

  const getItemLayout = useCallback<NonNullable<FlatListProps<LX.Music.MusicInfo>['getItemLayout']>>((_data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), [])

  const keyExtractor = useCallback<NonNullable<FlatListProps<LX.Music.MusicInfo>['keyExtractor']>>((item, idx) => `${item.id}_${idx}`, [])

  const pinnedTempSection = useMemo(() => {
    if (!tempPlayList.length) return null
    return (
      <View style={styles.tempSection}>
        <View style={styles.sectionHeader}>
          <Text size={12.5} color={theme['m3-primary']} style={styles.sectionTitle}>
            {t('queue_play_later_section', { num: tempPlayList.length })}
          </Text>
          <TouchableOpacity
            style={{ ...styles.smallChip, backgroundColor: theme['m3-surface-container-highest'] }}
            onPress={handleClearTemp}
          >
            <Icon name="eraser" size={12} color={theme['m3-on-surface-variant']} />
            <Text size={11.5} color={theme['m3-on-surface-variant']}>{t('queue_clear_later')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.tempScroll}
          contentContainerStyle={styles.tempListWrap}
        >
          {tempPlayList.map((item, idx) => (
            <TempQueueRow
              key={`${item.musicInfo.id}_${idx}`}
              item={item}
              index={idx}
              onPlayNow={handlePlayTempNow}
              onPromote={handlePromoteTemp}
              onRemove={handleRemoveTemp}
            />
          ))}
        </ScrollView>
        <Text size={12.5} color={theme['m3-on-surface-variant']} style={{ ...styles.sectionTitle, marginTop: 10, marginBottom: 4 }}>
          {t('queue_from_list', { name: listTitle })}
        </Text>
      </View>
    )
  }, [handleClearTemp, handlePlayTempNow, handlePromoteTemp, handleRemoveTemp, listTitle, t, tempPlayList, theme])

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={{ ...styles.modePill, backgroundColor: theme['m3-secondary-container'] }}
          onPress={toggleNextPlayMode}
        >
          <Icon name={playModeIcon} size={15} color={theme['m3-on-secondary-container']} />
          <Text size={12.5} color={theme['m3-on-secondary-container']} style={styles.modeText}>
            {t(`play_list_loop_${togglePlayMethod}`)}
          </Text>
        </TouchableOpacity>

        <View style={styles.toolbarRight}>
          <Text size={12.5} color={theme['m3-on-surface-variant']} numberOfLines={1} style={styles.countBadge}>
            {listTitle} · {queueList.length}
          </Text>
          {activeIndex >= 0 && queueList.length > 0
            ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={{ ...styles.locateChip, backgroundColor: theme['m3-surface-container-highest'] }}
                  onPress={() => {
                    hapticTick()
                    scrollToActive(true)
                  }}
                >
                  <Text size={12} color={theme['m3-primary']} style={styles.modeText}>
                    {t('queue_locate_current')}
                  </Text>
                </TouchableOpacity>
              )
            : null}
        </View>
      </View>

      {queueList.length == 0 && tempPlayList.length == 0
        ? (
            <View style={styles.emptyWrap}>
              <Text size={14} color={theme['m3-on-surface-variant']}>{t('no_item')}</Text>
            </View>
          )
        : (
            <>
              {pinnedTempSection}
              <FlatList
                ref={flatListRef}
                data={queueList}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                initialNumToRender={14}
                maxToRenderPerBatch={10}
                windowSize={9}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
              />
            </>
          )}
    </View>
  )
}

export default forwardRef<QueuePopupType, QueuePopupProps>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const popupRef = useRef<PopupType>(null)
  const t = useI18n()

  useImperativeHandle(ref, () => ({
    show() {
      if (visible) popupRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          popupRef.current?.setVisible(true)
        })
      }
    },
  }))

  return visible
    ? (
        <Popup ref={popupRef} title={t('queue_title')} {...props}>
          <QueueBody />
        </Popup>
      )
    : null
})

const styles = createStyle({
  container: {
    flexShrink: 1,
    minHeight: 280,
    maxHeight: 500,
    paddingHorizontal: 14,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    gap: 8,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Radius.full,
  },
  modeText: {
    fontWeight: '600',
  },
  toolbarRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  countBadge: {
    flexShrink: 1,
  },
  locateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: M3Radius.full,
  },
  tempSection: {
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  smallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: M3Radius.full,
  },
  tempScroll: {
    maxHeight: 136,
    flexGrow: 0,
  },
  tempListWrap: {
    gap: 6,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: M3Radius.md,
    borderWidth: 0.6,
    gap: 8,
  },
  nextBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: M3Radius.xs,
  },
  nextBadgeText: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 8,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: M3Radius.md,
  },
  indexCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontVariant: ['tabular-nums'],
  },
  rowTextWrap: {
    flex: 1,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  songTitle: {
    fontWeight: '500',
  },
  songTitleActive: {
    fontWeight: '700',
  },
  iconAction: {
    padding: 9,
    marginLeft: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
