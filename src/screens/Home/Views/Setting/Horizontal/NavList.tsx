import { memo, useRef, useState } from 'react'
import { View, Pressable, FlatList, type FlatListProps } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { SETTING_SCREENS, normalizeSettingScreenId, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { M3Radius, withAlpha } from '@/theme/m3'

type FlatListType = FlatListProps<SettingScreenIds>

const ITEM_HEIGHT = scaleSizeH(44)

const ListItem = memo(({ id, activeId, onPress }: {
  onPress: (item: SettingScreenIds) => void
  activeId: string
  id: SettingScreenIds
}) => {
  const theme = useTheme()
  const t = useI18n()

  const active = activeId == id

  const handlePress = () => {
    onPress(id)
  }

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
          android_ripple={{ color: withAlpha(theme['m3-primary'], 0.14) }}
          onPress={handlePress}
        >
          <Text
            numberOfLines={1}
            size={14}
            style={active ? styles.listNameActive : styles.listNameText}
            color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
          >
            {t(`setting_group_${id}`)}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.id === nextProps.id &&
    prevProps.activeId != nextProps.id &&
    nextProps.activeId != nextProps.id
  )
})


export default ({ onChangeId }: {
  onChangeId: (id: SettingScreenIds) => void
}) => {
  const flatListRef = useRef<FlatList>(null)
  const [activeId, setActiveId] = useState<SettingScreenIds>(() => normalizeSettingScreenId(global.lx.settingActiveId))

  const handleChangeId = (id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }

  const renderItem: FlatListType['renderItem'] = ({ item }) => (
    <ListItem
      key={item}
      id={item}
      activeId={activeId}
      onPress={handleChangeId}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }

  return (
    <FlatList
      ref={flatListRef}
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={SETTING_SCREENS}
      maxToRenderPerBatch={9}
      windowSize={9}
      removeClippedSubviews={true}
      initialNumToRender={10}
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
    paddingVertical: 8,
  },
  listItem: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  listItemInner: {
    flex: 1,
    borderRadius: M3Radius.full,
    overflow: 'hidden',
  },
  listName: {
    height: '100%',
    justifyContent: 'center',
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 14,
  },
  listNameText: {
    fontWeight: '400',
  },
  listNameActive: {
    fontWeight: '700',
  },
})
