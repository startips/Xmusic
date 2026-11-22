import { useRef, useImperativeHandle, forwardRef, useCallback, useState } from 'react'
import { TextInput, View, TouchableOpacity, StyleSheet, type TextInputProps } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { setSpText } from '@/utils/pixelRatio'

const styles = createStyle({
  content: {
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
  },
  input: {
    borderRadius: 2,
    paddingVertical: 0,
    paddingHorizontal: 5,
    height: 32,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 14,
  },
  clearBtnContent: {
    flexGrow: 0,
    flexShrink: 0,
  },
  clearBtn: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export interface InputProps extends TextInputProps {
  onChangeText?: (value: string) => void
  onClearText?: () => void
  clearBtn?: boolean
  size?: number
}

export interface InputType {
  blur: () => void
  focus: () => void
  clear: () => void
  isFocused: () => boolean
}

export default forwardRef<InputType, InputProps>(({ onChangeText, onClearText, clearBtn, style, size = 14, value, defaultValue, ...props }, ref) => {
  const inputRef = useRef<TextInput>(null)
  const theme = useTheme()
  const [hasText, setHasText] = useState(Boolean(value ?? defaultValue))

  useImperativeHandle(ref, () => ({
    blur() {
      inputRef.current?.blur()
    },
    focus() {
      inputRef.current?.focus()
    },
    clear() {
      inputRef.current?.clear()
      setHasText(false)
    },
    isFocused() {
      return inputRef.current?.isFocused() ?? false
    },
  }))

  const clearText = useCallback(() => {
    inputRef.current?.clear()
    setHasText(false)
    onChangeText?.('')
    onClearText?.()
  }, [onChangeText, onClearText])

  const changeText = useCallback((text: string) => {
    setHasText(text.length > 0)
    onChangeText?.(text)
  }, [onChangeText])

  const showClear = clearBtn && (value !== undefined ? value.length > 0 : hasText)

  return (
    <View style={styles.content}>
      <TextInput
        autoCapitalize="none"
        onChangeText={changeText}
        autoComplete="off"
        value={value}
        defaultValue={defaultValue}
        style={StyleSheet.compose({ ...styles.input, color: theme['m3-on-surface'], fontSize: setSpText(size) }, style)}
        placeholderTextColor={theme['m3-on-surface-variant']}
        selectionColor={theme['m3-primary']}
        ref={inputRef}
        {...props}
      />
      {showClear
        ? <View style={styles.clearBtnContent}>
            <TouchableOpacity style={styles.clearBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} onPress={clearText}>
              <Icon name="remove" color={theme['m3-on-surface-variant']} size={12} />
            </TouchableOpacity>
          </View>
        : null
      }
    </View>
  )
})
