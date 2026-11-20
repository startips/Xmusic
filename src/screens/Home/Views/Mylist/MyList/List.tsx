import { memo, useEffect, useRef } from 'react'
import { View, Pressable, FlatList, type NativeScrollEvent, type NativeSyntheticEvent, type FlatListProps } from 'react-native'

import { Icon } from '@/components/common/Icon'

import { useTheme } from '@/store/theme/hook'
import { useActiveListId, useListFetching, useMyList } from '@/store/list/hook'
import { createStyle } from '@/utils/tools'
import { LIST_SCROLL_POSITION_KEY } from '@/config/constant'
import { getListPosition, saveListPosition } from '@/utils/data'
import { setActiveList } from '@/core/list'
import Text from '@/components/common/Text'
import { type Position } from './ListMenu'
import { scaleSizeH } from '@/utils/pixelRatio'
import Loading from '@/components/common/Loading'
import { M3Radius, withAlpha } from '@/theme/m3'

type FlatListType = FlatListProps<LX.List.MyListInfo>

const ITEM_HEIGHT = scaleSizeH(48)

const ListItem = memo(({ item, index, activeId, onPress, onShowMenu }: {
  onPress: (item: LX.List.MyListInfo) => void
  index: number
  activeId: string
  item: LX.List.MyListInfo
  onShowMenu: (item: LX.List.MyListInfo, index: number, position: { x: number, y: number, w: number, h: number }) => void
}) => {
  const theme = useTheme()
  const moreButtonRef = useRef<View>(null)
  const fetching = useListFetching(item.id)

  const active = activeId == item.id

  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }

  const handlePress = () => {
    onPress(item)
  }

  const rippleColor = withAlpha(theme['m3-primary'], 0.14)

  return (
    <View style={{ ...styles.listItem, height: ITEM_HEIGHT }}>
      <View
        style={{
          ...styles.listItemInner,
          backgroundColor: active ? theme['m3-secondary-container'] : 'transparent',
        }}
      >
        <Pressable
          style={styles.listName}
          android_ripple={{ color: rippleColor }}
          onPress={handlePress}
        >
          {
            active
              ? <Icon style={styles.listActiveIcon} name="chevron-right" size={12} color={theme['m3-on-secondary-container']} />
              : null
          }
          { fetching ? <Loading color={active ? theme['m3-on-secondary-container'] : theme['m3-primary']} style={styles.loading} /> : null }
          <Text
            style={active ? styles.listNameTextActive : styles.listNameText}
            size={14}
            numberOfLines={1}
            color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface']}
          >
            {item.name}
          </Text>
        </Pressable>
        <View ref={moreButtonRef} collapsable={false} style={styles.listMoreWrap}>
          <Pressable
            onPress={handleShowMenu}
            android_ripple={{ color: withAlpha(theme['m3-on-surface'], 0.12), borderless: true }}
            style={styles.listMoreBtn}
          >
            <Icon name="dots-vertical" color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']} size={13} />
          </Pressable>
        </View>
      </View>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.item.name == nextProps.item.name &&
    prevProps.activeId != nextProps.item.id &&
    nextProps.activeId != nextProps.item.id
  )
})


export default ({ onShowMenu }: {
  onShowMenu: (info: { listInfo: LX.List.MyListInfo, index: number }, position: Position) => void
}) => {
  const flatListRef = useRef<FlatList>(null)
  const allList = useMyList()
  const activeListId = useActiveListId()

  const handleToggleList = (item: LX.List.MyListInfo) => {
    // setVisiblePanel(false)
    global.app_event.changeLoveListVisible(false)
    requestAnimationFrame(() => {
      setActiveList(item.id)
    })
  }


  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    void saveListPosition(LIST_SCROLL_POSITION_KEY, nativeEvent.contentOffset.y)
  }

  const showMenu = (listInfo: LX.List.MyListInfo, index: number, position: Position) => {
    onShowMenu({ listInfo, index }, position)
  }

  useEffect(() => {
    void getListPosition(LIST_SCROLL_POSITION_KEY).then((offset) => {
      flatListRef.current?.scrollToOffset({ offset, animated: false })
    })
  }, [])

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      key={item.id}
      item={item}
      index={index}
      activeId={activeListId}
      onPress={handleToggleList}
      onShowMenu={showMenu}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item.id
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }

  return (
    <FlatList
      ref={flatListRef}
      onScroll={handleScroll}
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={allList}
      maxToRenderPerBatch={9}
      windowSize={9}
      removeClippedSubviews={true}
      initialNumToRender={18}
      renderItem={renderItem}
      keyExtractor={getkey}
      getItemLayout={getItemLayout}
    />
  )
}


const styles = createStyle({
  container: {
    flexShrink: 1,
    flexGrow: 0,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  listItem: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  listItemInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: M3Radius.full,
    overflow: 'hidden',
  },
  listActiveIcon: {
    marginRight: 8,
  },
  loading: {
    marginRight: 8,
  },
  listName: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 14,
    paddingRight: 8,
  },
  listNameText: {
    flexShrink: 1,
    fontWeight: '400',
  },
  listNameTextActive: {
    flexShrink: 1,
    fontWeight: '600',
  },
  listMoreWrap: {
    height: '100%',
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  listMoreBtn: {
    width: 34,
    height: 34,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

