import { View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { M3Radius, withAlpha } from '@/theme/m3'


interface Props {
  title: string
  children: React.ReactNode | React.ReactNode[]
}

export default ({ title, children }: Props) => {
  const theme = useTheme()

  return (
    <View style={styles.container}>
      <Text style={styles.title} color={theme['m3-primary']} size={14}>{title}</Text>
      <View
        style={{
          ...styles.card,
          backgroundColor: withAlpha(theme['m3-surface-container'], 0.78),
          borderColor: theme['m3-outline-variant'],
        }}
      >
        {children}
      </View>
    </View>
  )
}


const styles = createStyle({
  container: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    paddingLeft: 6,
    marginBottom: 8,
  },
  card: {
    borderRadius: M3Radius.lg,
    borderWidth: 0.6,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
})
