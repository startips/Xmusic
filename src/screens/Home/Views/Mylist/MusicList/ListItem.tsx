import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
// import { BorderWidths } from '@/theme'
import { Icon } from '@/components/common/Icon'
import { createStyle, type RowInfo } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useAssertApiSupport } from '@/store/common/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import Text from '@/components/common/Text'
import Badge from '@/components/common/Badge'
import { M3Radius, withAlpha } from '@/theme/m3'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)


export default memo(({ item, index, activeIndex, onPress, onShowMenu, onLongPress, selectedList, rowInfo, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfo
  index: number
  activeIndex: number
  onPress: (item: LX.Music.MusicInfo, index: number) => void
  onLongPress: (item: LX.Music.MusicInfo, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfo, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfo[]
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()

  const isSelected = selectedList.includes(item)
  // console.log(item.name, selectedList, selectedList.includes(item))
  const isSupported = useAssertApiSupport(item.source)
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        // console.log(fx, fy, width, height, px, py)
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }
  const active = activeIndex == index

  const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? ` · ${item.meta.albumName}` : ''}`
  const rowBg = isSelected
    ? theme['m3-primary-container']
    : active
      ? withAlpha(theme['m3-primary-container'], 0.65)
      : 'transparent'

  return (
    <View style={{ ...styles.listItem, width: rowInfo.rowWidth, height: ITEM_HEIGHT, opacity: isSupported ? 1 : 0.5 }}>
      <View style={{ ...styles.rowInner, backgroundColor: rowBg }}>
        <TouchableOpacity style={styles.listItemLeft} activeOpacity={0.65} onPress={() => { onPress(item, index) }} onLongPress={() => { onLongPress(item, index) }}>
          {
            active
              ? <Icon style={styles.sn} name="play-outline" size={14} color={theme['m3-primary']} />
              : <Text style={styles.sn} size={13} color={theme['m3-on-surface-variant']}>{index + 1}</Text>
          }
          <View style={styles.itemInfo}>
            <Text
              size={15}
              style={active ? styles.titleActive : styles.titleText}
              color={isSelected || active ? theme['m3-on-primary-container'] : theme['m3-on-surface']}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View style={styles.listItemSingle}>
              <Badge>{item.source.toUpperCase()}</Badge>
              <Text
                style={styles.listItemSingleText}
                size={12}
                color={isSelected || active ? theme['m3-on-primary-container'] : theme['m3-on-surface-variant']}
                numberOfLines={1}
              >
                {singer}
              </Text>
            </View>
          </View>
          {
            isShowInterval ? (
              <Text size={12} color={active ? theme['m3-on-primary-container'] : theme['m3-on-surface-variant']} numberOfLines={1}>{item.interval}</Text>
            ) : null
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
          <Icon name="dots-vertical" style={{ color: theme['m3-on-surface-variant'] }} size={13} />
        </TouchableOpacity>
      </View>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
    prevProps.isShowInterval === nextProps.isShowInterval &&
    prevProps.activeIndex != nextProps.index &&
    nextProps.activeIndex != nextProps.index &&
    nextProps.selectedList.includes(nextProps.item) == prevProps.selectedList.includes(nextProps.item)
  )
})


const styles = createStyle({
  listItem: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingLeft: 4,
    paddingRight: 2,
    borderRadius: M3Radius.md,
    alignItems: 'center',
  },
  listItemLeft: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  sn: {
    width: 34,
    textAlign: 'center',
    paddingLeft: 3,
    paddingRight: 3,
    fontWeight: '500',
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 6,
  },
  titleText: {
    fontWeight: '500',
  },
  titleActive: {
    fontWeight: '700',
  },
  listItemSingle: {
    paddingTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemSingleText: {
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '400',
  },
  listItemRight: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    justifyContent: 'center',
  },

  moreButton: {
    height: '80%',
    paddingLeft: 14,
    paddingRight: 12,
    justifyContent: 'center',
  },
})
