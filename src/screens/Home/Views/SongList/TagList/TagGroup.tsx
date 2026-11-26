import { View } from 'react-native'

import Button from '@/components/common/Button'
import { type TagInfoItem } from '@/store/songlist/state'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { M3Radius } from '@/theme/m3'

export interface TagGroupProps {
  name: string
  list: TagInfoItem[]
  onTagChange: (name: string, id: string) => void
  activeId: string
}

export default ({ name, list, onTagChange, activeId }: TagGroupProps) => {
  const theme = useTheme()
  return (
    <View>
      {
        name
          ? <Text size={12.5} style={styles.tagTypeTitle} color={theme['m3-on-surface-variant']}>{name}</Text>
          : null
      }
      <View style={styles.tagTypeList}>
        {list.map(item => (
          activeId == item.id
            ? (
                <View style={{ ...styles.tagButton, backgroundColor: theme['m3-primary'] }} key={item.id}>
                  <Text size={13} style={styles.tagButtonTextActive} color={theme['m3-on-primary']}>{item.name}</Text>
                </View>
              )
            : (
                <Button
                  style={{
                    ...styles.tagButton,
                    ...styles.tagButtonInactive,
                    backgroundColor: theme['m3-surface-container-high'],
                    borderColor: theme['m3-outline-variant'],
                  }}
                  key={item.id}
                  onPress={() => { onTagChange(item.name, item.id) }}
                >
                  <Text size={13} style={styles.tagButtonText} color={theme['m3-on-surface']}>{item.name}</Text>
                </Button>
              )

        ))}
      </View>
    </View>
  )
}

const styles = createStyle({
  tagTypeTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  tagTypeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    borderRadius: M3Radius.full,
  },
  tagButtonInactive: {
    borderWidth: 0.6,
  },
  tagButtonText: {
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  tagButtonTextActive: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    fontWeight: '600',
  },
})
