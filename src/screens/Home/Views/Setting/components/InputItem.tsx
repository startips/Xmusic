import { memo, useState, useEffect, useRef } from 'react'

import { StyleSheet, View, Keyboard } from 'react-native'
import type { InputType, InputProps } from '@/components/common/Input'
import Input from '@/components/common/Input'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { M3Radius } from '@/theme/m3'


export interface InputItemProps extends InputProps {
  value: string
  label: string
  onChanged: (text: string, callback: (vlaue: string) => void) => void
}

export default memo(({ value, label, onChanged, ...props }: InputItemProps) => {
  const [text, setText] = useState(value)
  const textRef = useRef(value)
  const isMountRef = useRef(false)
  const inputRef = useRef<InputType>(null)
  const theme = useTheme()
  const saveValue = () => {
    onChanged?.(text, (value: string) => {
      if (!isMountRef.current) return
      const newValue = String(value)
      setText(newValue)
      textRef.current = newValue
    })
  }
  useEffect(() => {
    isMountRef.current = true
    return () => {
      isMountRef.current = false
    }
  }, [])
  useEffect(() => {
    const handleKeyboardDidHide = () => {
      if (!inputRef.current?.isFocused()) return
      onChanged?.(textRef.current, value => {
        if (!isMountRef.current) return
        const newValue = String(value)
        setText(newValue)
        textRef.current = newValue
      })
    }
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', handleKeyboardDidHide)

    return () => {
      keyboardDidHide.remove()
    }
  }, [onChanged])
  useEffect(() => {
    if (value != text) {
      const newValue = String(value)
      setText(newValue)
      textRef.current = newValue
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const handleSetSelectMode = (text: string) => {
    setText(text)
    textRef.current = text
  }
  return (
    <View style={styles.container}>
      <Text style={styles.label} size={13} color={theme['m3-on-surface-variant']}>{label}</Text>
      <Input
        value={text}
        ref={inputRef}
        onChangeText={handleSetSelectMode}
        style={{
          ...styles.input,
          backgroundColor: theme['m3-surface-container-high'],
          borderColor: theme['m3-outline-variant'],
        }}
        {...props}
        onBlur={saveValue}
       />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingLeft: 25,
    paddingRight: 25,
    marginBottom: 15,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: M3Radius.sm,
    borderWidth: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 40,
    maxWidth: 300,
  },
})
