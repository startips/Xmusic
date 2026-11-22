import { memo, useCallback, useMemo } from 'react'
import { Pressable, TouchableOpacity, View } from 'react-native'

import { type CheckBoxProps } from '@/components/common/CheckBox'
import { Icon } from '@/components/common/Icon'
import ExpressiveSwitch from '@/components/common/m3e/ExpressiveSwitch'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { hapticTick } from '@/utils/haptics'
import { scaleSizeH } from '@/utils/pixelRatio'
import { createStyle, tipDialog } from '@/utils/tools'

export default memo(({
  check,
  label,
  children,
  onChange,
  helpTitle,
  helpDesc,
  disabled = false,
  need = false,
  marginBottom = 0,
  size = 1,
}: CheckBoxProps) => {
  const theme = useTheme()
  const switchDisabled = disabled || (need && check)

  const handleToggle = useCallback((nextVal: boolean) => {
    if (switchDisabled) return
    onChange(nextVal)
  }, [onChange, switchDisabled])

  const helpComponent = useMemo(() => {
    if (!helpTitle && !helpDesc) return null
    const handleShowHelp = () => {
      void tipDialog({
        title: helpTitle ?? '',
        message: helpDesc,
        btnText: global.i18n.t('understand'),
      })
    }
    return (
      <TouchableOpacity style={styles.helpBtn} onPress={handleShowHelp} hitSlop={8}>
        <Icon size={14} name="help" color={theme['m3-on-surface-variant']} />
      </TouchableOpacity>
    )
  }, [helpDesc, helpTitle, theme])

  const textColor = switchDisabled && disabled ? theme['m3-outline'] : theme['m3-on-surface']

  return (
    <Pressable
      disabled={switchDisabled}
      onPress={() => {
        hapticTick()
        handleToggle(!check)
      }}
      style={[
        styles.row,
        marginBottom ? { marginBottom: scaleSizeH(marginBottom) } : null,
      ]}
    >
      <View style={styles.leftCol}>
        <View style={styles.labelWrap}>
          {label
            ? <Text size={14 * size} color={textColor} style={styles.labelText}>{label}</Text>
            : children}
        </View>
        {helpComponent}
      </View>
      <ExpressiveSwitch value={check} onValueChange={handleToggle} disabled={switchDisabled} />
    </Pressable>
  )
})

const styles = createStyle({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 15,
    paddingRight: 10,
    paddingVertical: 9,
    gap: 12,
  },
  leftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelWrap: {
    flexShrink: 1,
  },
  labelText: {
    lineHeight: 20,
  },
  helpBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
})
