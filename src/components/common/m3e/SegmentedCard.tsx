import { memo, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

export const SegmentedCardGroup = memo(({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) => {
  return <View style={[styles.group, style]}>{children}</View>
})

/**
 * M3 Expressive segmented card row with large outer corners and subtle 6dp inner seams.
 */
export const SegmentedCardItem = memo(({
  index,
  count,
  backgroundColor,
  style,
  children,
}: {
  index: number
  count: number
  backgroundColor?: string
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) => {
  const theme = useTheme()
  const topRadius = index === 0 ? 20 : 6
  const bottomRadius = index === count - 1 ? 20 : 6

  return (
    <View
      style={[
        {
          backgroundColor: backgroundColor ?? theme['m3-surface-container'],
          borderTopLeftRadius: topRadius,
          borderTopRightRadius: topRadius,
          borderBottomLeftRadius: bottomRadius,
          borderBottomRightRadius: bottomRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  )
})

const styles = createStyle({
  group: {
    gap: 2,
  },
})
