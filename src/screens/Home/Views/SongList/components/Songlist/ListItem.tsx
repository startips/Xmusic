import { memo } from 'react'
import { View, Platform, TouchableOpacity } from 'react-native'
import { createStyle } from '@/utils/tools'
import { type ListInfoItem } from '@/store/songlist/state'
import Text from '@/components/common/Text'
import { scaleSizeW } from '@/utils/pixelRatio'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useTheme } from '@/store/theme/hook'
import Image from '@/components/common/Image'
import { M3Radius } from '@/theme/m3'

const gap = Math.min(scaleSizeW(15), 14)
export default memo(({ item, index, width, showSource, onPress }: {
  item: ListInfoItem
  index: number
  showSource: boolean
  width: number
  onPress: (item: ListInfoItem, index: number) => void
}) => {
  const theme = useTheme()
  const itemWidth = width - gap
  const handlePress = () => {
    onPress(item, index)
  }
  return (
    item.source
      ? (
          <View style={{ ...styles.listItem, width: itemWidth }}>
            <View style={{ ...styles.listItemImg, backgroundColor: theme['m3-surface-container'] }}>
              <TouchableOpacity activeOpacity={0.75} onPress={handlePress}>
                <Image url={item.img} nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_from_${item.source}_${item.id}`} style={{ width: itemWidth, height: itemWidth, borderRadius: M3Radius.md }} />
                { showSource ? <Text style={styles.sourceLabel} size={9} color="#fff" >{item.source}</Text> : null }
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.75} onPress={handlePress}>
              <Text style={styles.listItemTitle} color={theme['m3-on-surface']} numberOfLines={ 2 }>{item.name}</Text>
            </TouchableOpacity>
            {/* <Text>{JSON.stringify(item)}</Text> */}
          </View>
        )
      : <View style={{ ...styles.listItem, width: itemWidth }} />
  )
})

const styles = createStyle({
  listItem: {
    // width: 90,
    marginTop: 8,
    marginBottom: 10,
  },
  listItemImg: {
    borderRadius: M3Radius.md,
    marginBottom: 7,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.16,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sourceLabel: {
    paddingLeft: 6,
    paddingBottom: 3,
    paddingTop: 2,
    paddingRight: 6,
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  listItemTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 5,
  },
})
