import { TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'
import { createStyle } from '@/utils/tools'
import { forwardRef, useImperativeHandle, useState } from 'react'

export interface CurrentTagBtnProps {
  onShowList: () => void
}

export interface CurrentTagBtnType {
  setCurrentTagInfo: (name: string, activeId?: string) => void
}

export default forwardRef<CurrentTagBtnType, CurrentTagBtnProps>(({ onShowList }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const [name, setName] = useState('')
  const [isCustomTag, setIsCustomTag] = useState(false)

  useImperativeHandle(ref, () => ({
    setCurrentTagInfo(nextName, activeId) {
      const hasCustomTag = Boolean(activeId)
      setIsCustomTag(hasCustomTag)
      setName(hasCustomTag && nextName ? nextName : t('songlist_tags'))
    },
  }), [t])

  return (
    <TouchableOpacity
      onPress={onShowList}
      activeOpacity={0.75}
      style={{
        ...styles.btn,
        backgroundColor: isCustomTag ? theme['m3-primary-container'] : theme['m3-surface-container'],
        borderColor: isCustomTag ? 'transparent' : theme['m3-outline-variant'],
      }}
    >
      <Text
        numberOfLines={1}
        size={13}
        style={styles.label}
        color={isCustomTag ? theme['m3-on-primary-container'] : theme['m3-on-surface']}
      >
        {name || t('songlist_tags')}
      </Text>
      <Icon
        name="chevron-right"
        size={11}
        color={isCustomTag ? theme['m3-on-primary-container'] : theme['m3-on-surface-variant']}
      />
    </TouchableOpacity>
  )
})

const styles = createStyle({
  btn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: M3Radius.full,
    borderWidth: 0.8,
  },
  label: {
    flex: 1,
    paddingRight: 8,
    fontWeight: '600',
  },
})
