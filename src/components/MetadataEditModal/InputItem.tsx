import { memo } from 'react'

import { StyleSheet, View } from 'react-native'
import type { InputProps } from '@/components/common/Input'
import Input from '@/components/common/Input'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { M3Radius } from '@/theme/m3'


export interface InputItemProps extends InputProps {
  value: string
  label: string
  onChanged: (text: string) => void
}

export default memo(({ value, label, onChanged, ...props }: InputItemProps) => {
  const theme = useTheme()
  return (
    <View style={styles.container}>
      <Text style={styles.label} size={13} color={theme['m3-on-surface-variant']}>{label}</Text>
      <Input
        value={value}
        onChangeText={onChanged}
        style={{
          ...styles.input,
          backgroundColor: theme['m3-surface-container-lowest'],
          borderColor: theme['m3-outline-variant'],
        }}
        {...props}
       />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 5,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: M3Radius.sm,
    borderWidth: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 38,
  },
})
