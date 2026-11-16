import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
// import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { createStyle, type RowInfo } from '@/utils/tools'
import { M3Radius } from '@/theme/m3'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  const t = useI18n()
  let info: { type: BadgeType | null, text: string } = { type: null, text: '' }
  if (musicInfo.meta._qualitys.flac24bit) {
    info.type = 'secondary'
    info.text = t('quality_lossless_24bit')
  } else if (musicInfo.meta._qualitys.flac ?? musicInfo.meta._qualitys.ape) {
    info.type = 'secondary'
    info.text = t('quality_lossless')
  } else if (musicInfo.meta._qualitys['320k']) {
    info.type = 'tertiary'
    info.text = t('quality_high_quality')
  }

  return info
}

export default memo(({ item, index, showSource, onPress, onLongPress, onShowMenu, selectedList, rowInfo, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfoOnline
  index: number
  showSource?: boolean
  onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onLongPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfoOnline, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfoOnline[]
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()

  const isSelected = selectedList.includes(item)

  const moreButtonRef = useRef<TouchableOpacity>(null)
  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        // console.log(fx, fy, width, height, px, py)
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }
  const tagInfo = useQualityTag(item)

  const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? ` · ${item.meta.albumName}` : ''}`
  const isTopRank = index < 3

  return (
    <View style={{ ...styles.listItem, width: rowInfo.rowWidth, height: ITEM_HEIGHT }}>
      <View
        style={{
          ...styles.rowInner,
          backgroundColor: isSelected ? theme['m3-primary-container'] : 'transparent',
        }}
      >
        <TouchableOpacity style={styles.listItemLeft} activeOpacity={0.65} onPress={() => { onPress(item, index) }} onLongPress={() => { onLongPress(item, index) }}>
          <Text
            style={isTopRank ? styles.snTop : styles.sn}
            size={13}
            color={isTopRank ? theme['m3-primary'] : theme['m3-on-surface-variant']}
          >
            {index + 1}
          </Text>
          <View style={styles.itemInfo}>
            <Text
              size={15}
              style={styles.titleText}
              color={isSelected ? theme['m3-on-primary-container'] : theme['m3-on-surface']}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View style={styles.listItemSingle}>
              { tagInfo.type ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null }
              { showSource ? <Badge type="tertiary">{item.source}</Badge> : null }
              <Text
                style={styles.listItemSingleText}
                size={12}
                color={isSelected ? theme['m3-on-primary-container'] : theme['m3-on-surface-variant']}
                numberOfLines={1}
              >
                {singer}
              </Text>
            </View>
          </View>
          {
            isShowInterval ? (
              <Text size={12} color={theme['m3-on-surface-variant']} numberOfLines={1}>{item.interval}</Text>
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
  snTop: {
    width: 34,
    textAlign: 'center',
    paddingLeft: 3,
    paddingRight: 3,
    fontWeight: '700',
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 6,
  },
  titleText: {
    fontWeight: '500',
  },
  listItemSingle: {
    paddingTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemTimeLabel: {
    marginRight: 5,
    fontWeight: '400',
  },
  listItemSingleText: {
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '400',
  },
  listItemBadge: {
    paddingLeft: 5,
    paddingTop: 2,
    alignSelf: 'flex-start',
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

