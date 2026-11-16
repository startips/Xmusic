import { useEffect, useMemo, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { type SearchType } from '@/store/search/state'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { getSearchSetting } from '@/utils/data'
import { M3Radius } from '@/theme/m3'

const SEARCH_TYPE_LIST = [
  'music',
  'songlist',
] as const

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const [type, setType] = useState<SearchType>('music')

  useEffect(() => {
    void getSearchSetting().then(info => {
      setType(info.type)
    })
  }, [])

  const list = useMemo(() => {
    return SEARCH_TYPE_LIST.map(type => ({ label: t(`search_type_${type}`), id: type }))
  }, [t])

  const handleTypeChange = (type: SearchType) => {
    setType(type)
    global.app_event.searchTypeChanged(type)
  }

  return (
    <View style={{ ...styles.container, backgroundColor: theme['m3-surface-container'] }}>
      {
        list.map(item => {
          const active = type == item.id
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.75}
              style={{
                ...styles.button,
                backgroundColor: active ? theme['m3-secondary-container'] : 'transparent',
              }}
              onPress={() => { handleTypeChange(item.id) }}
            >
              <Text
                size={13}
                style={active ? styles.buttonTextActive : styles.buttonText}
                color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: M3Radius.full,
    padding: 3,
  },
  button: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: M3Radius.full,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '400',
  },
  buttonTextActive: {
    textAlign: 'center',
    fontWeight: '600',
  },
})
