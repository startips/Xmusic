import { memo, useMemo } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { withAlpha } from '@/theme/m3'
import Text from './Text'

const styles = createStyle({
  container: {
    marginRight: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    alignSelf: 'center',
  },
  text: {
    fontWeight: '600',
  },
})

export type BadgeType = 'normal' | 'secondary' | 'tertiary'

export default memo(({ type = 'normal', children }: {
  type?: BadgeType
  children: string
}) => {
  const theme = useTheme()
  const colors = useMemo(() => {
    let textColor = theme['c-badge-primary']
    switch (type) {
      case 'normal':
        textColor = theme['c-badge-primary']
        break
      case 'secondary':
        textColor = theme['c-badge-secondary']
        break
      case 'tertiary':
        textColor = theme['c-badge-tertiary']
        break
    }
    return {
      textColor,
      bgColor: withAlpha(textColor, theme.isDark ? 0.2 : 0.14),
    }
  }, [type, theme])

  return (
    <View style={{ ...styles.container, backgroundColor: colors.bgColor }}>
      <Text style={styles.text} size={9} color={colors.textColor}>{children}</Text>
    </View>
  )
})

