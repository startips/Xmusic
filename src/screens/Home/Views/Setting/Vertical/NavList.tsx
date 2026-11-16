import { memo, useCallback, useState } from 'react'
import { TouchableOpacity, ScrollView } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { M3Radius } from '@/theme/m3'


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
        {t(`setting_${id}`)}
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
  const [activeId, setActiveId] = useState(global.lx.settingActiveId)

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ScrollView horizontal style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps={'always'} showsHorizontalScrollIndicator={false}>
      {
        SETTING_SCREENS.map(id => <ListItem key={id} id={id} activeId={activeId} onPress={handleChangeId} />)
      }
    </ScrollView>
  )
}


const styles = createStyle({
  container: {
    height: 44,
    flexGrow: 0,
    flexShrink: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 6,
  },
  listItem: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listText: {
    fontWeight: '400',
  },
  listTextActive: {
    fontWeight: '600',
  },
})
