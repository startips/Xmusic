import { memo, useCallback, useState } from 'react'
import { TouchableOpacity, ScrollView } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, normalizeSettingScreenId, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { M3Radius } from '@/theme/m3'
import { hapticTick } from '@/utils/haptics'


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
    <TouchableOpacity
      style={{
        ...styles.listItem,
        backgroundColor: active ? theme['m3-secondary-container'] : theme['m3-surface-container'],
        borderColor: active ? 'transparent' : theme['m3-outline-variant'],
        borderWidth: active ? 0 : 0.6,
      }}
      activeOpacity={0.75}
      onPress={handlePress}
    >
      <Text
        size={13}
        numberOfLines={1}
        style={active ? styles.listTextActive : styles.listText}
        color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
      >
        {t(`setting_group_${id}`)}
      </Text>
    </TouchableOpacity>
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
  const [activeId, setActiveId] = useState<SettingScreenIds>(() => normalizeSettingScreenId(global.lx.settingActiveId))

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    hapticTick()
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }, [onChangeId])

  return (
    <ScrollView
      horizontal
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps={'always'}
      showsHorizontalScrollIndicator={false}
    >
      {
        SETTING_SCREENS.map(id => <ListItem key={id} id={id} activeId={activeId} onPress={handleChangeId} />)
      }
    </ScrollView>
  )
}


const styles = createStyle({
  container: {
    height: 46,
    flexGrow: 0,
    flexShrink: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 8,
  },
  listItem: {
    height: 34,
    paddingHorizontal: 15,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listText: {
    fontWeight: '500',
  },
  listTextActive: {
    fontWeight: '700',
  },
})
