import { useState, useRef, useEffect } from 'react'
import { View } from 'react-native'
import Input, { type InputType } from '@/components/common/Input'
import { confirmDialog, createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { createUserList } from '@/core/list'
import listState from '@/store/list/state'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'

export default ({ isEdit, onHide }: {
  isEdit: boolean
  onHide: () => void
}) => {
  const [text, setText] = useState('')
  const inputRef = useRef<InputType>(null)
  const t = useI18n()
  const theme = useTheme()

  useEffect(() => {
    if (isEdit) {
      setText('')
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isEdit])

  const handleSubmitEditing = async() => {
    onHide()
    const name = text.trim()
    if (!name.length || (listState.userList.some(l => l.name == name) && !(await confirmDialog({
      message: global.i18n.t('list_duplicate_tip'),
    })))) return
    void createUserList(listState.userList.length, [{ id: `userlist_${Date.now()}`, name, locationUpdateTime: null }])
  }

  return isEdit
    ? (
      <View style={styles.imputContainer}>
        <Input
          placeholder={t('list_create_input_placeholder')}
          value={text}
          onChangeText={setText}
          ref={inputRef}
          onBlur={handleSubmitEditing}
          onSubmitEditing={handleSubmitEditing}
          style={{
            ...styles.input,
            backgroundColor: theme['m3-surface-container-high'],
            borderColor: theme['m3-outline-variant'],
          }}
        />
      </View>
      )
    : null
}

const styles = createStyle({
  imputContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    borderRadius: M3Radius.full,
    borderWidth: 0.8,
    paddingHorizontal: 14,
    textAlign: 'center',
    height: '100%',
  },
})
