import { memo } from 'react'
import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { M3Radius } from '@/theme/m3'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()

  const swatches = [
    theme['m3-primary'],
    theme['m3-secondary'],
    theme['m3-tertiary'],
    theme['m3-surface-container-high'],
    theme['m3-on-surface-variant'],
  ]

  return (
    <SubTitle title={t('setting_basic_theme')}>
      <View style={{ ...styles.card, backgroundColor: theme['m3-surface-container'], borderColor: theme['m3-outline-variant'] }}>
        <View style={styles.swatches}>
          {swatches.map((color, index) => (
            <View key={index} style={{ ...styles.swatch, backgroundColor: color }} />
          ))}
        </View>
        <View style={styles.info}>
          <Text size={15} color={theme['m3-on-surface']} style={styles.name}>{theme.name}</Text>
          <Text size={12} color={theme['m3-on-surface-variant']} numberOfLines={2}>{t('setting_basic_theme_desc')}</Text>
        </View>
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  card: {
    marginRight: 25,
    padding: 14,
    borderRadius: M3Radius.lg,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  swatches: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swatch: {
    width: 18,
    height: 42,
    borderRadius: M3Radius.xs,
  },
  info: {
    flexShrink: 1,
  },
  name: {
    fontWeight: '700',
    marginBottom: 4,
  },
})
