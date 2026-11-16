import { forwardRef, useImperativeHandle, useState } from 'react'
import { TouchableOpacity } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { M3Radius } from '@/theme/m3'

export interface ActiveListNameProps {
  onShowBound: () => void
}
export interface ActiveListNameType {
  setBound: (id: string, name: string) => void
}

export default forwardRef<ActiveListNameType, ActiveListNameProps>(({ onShowBound }, ref) => {
  const theme = useTheme()
  let [currentListName, setCurrentListName] = useState('')

  useImperativeHandle(ref, () => ({
    setBound(id, name) {
      setCurrentListName(name)
    },
  }), [])

  return (
    <TouchableOpacity
      onPress={onShowBound}
      activeOpacity={0.75}
      style={{
        ...styles.currentList,
        backgroundColor: theme['m3-surface-container'],
        borderColor: theme['m3-outline-variant'],
      }}
    >
      <Text numberOfLines={1} size={13} style={styles.currentListText} color={theme['m3-on-surface']}>{currentListName}</Text>
      <Icon name="chevron-right" size={11} color={theme['m3-on-surface-variant']} />
    </TouchableOpacity>
  )
})


const styles = createStyle({
  currentList: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: M3Radius.full,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentListText: {
    flex: 1,
    paddingRight: 8,
    fontWeight: '600',
  },
})
