import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'
import { createStyle } from '@/utils/tools'
import { forwardRef, useImperativeHandle, useState } from 'react'


export interface CurrentTagBtnProps {
  onShowList: () => void
}

export interface CurrentTagBtnType {
  setCurrentTagInfo: (name: string) => void
}

export default forwardRef<CurrentTagBtnType, CurrentTagBtnProps>(({ onShowList }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const [name, setName] = useState('')

  useImperativeHandle(ref, () => ({
    setCurrentTagInfo(name) {
      if (!name) name = t('songlist_tag_default')
      setName(name)
    },
  }))

  return (
    <Button style={{ ...styles.btn, backgroundColor: theme['m3-surface-container'] }} onPress={onShowList}>
      <Text numberOfLines={1} size={13} style={styles.sourceMenu} color={theme['m3-on-surface']}>{name}</Text>
    </Button>
  )
})


const styles = createStyle({
  btn: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    maxWidth: 160,
  },
  sourceMenu: {
    textAlign: 'center',
    fontWeight: '500',
  },
})
