import { memo } from 'react'
import { Pressable, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { M3Radius, withAlpha } from '@/theme/m3'
import { getThemeSeedOption, XMUSIC_THEME_SEEDS } from '@/theme'
import { setThemeId } from '@/core/theme'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const activeSeed = getThemeSeedOption(theme.id)

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
          <Text size={15} color={theme['m3-on-surface']} style={styles.name}>{`${theme.name} · ${t(activeSeed.nameKey)}`}</Text>
          <Text size={12} color={theme['m3-on-surface-variant']} numberOfLines={2}>{t('setting_basic_theme_desc')}</Text>
        </View>
      </View>

      <View style={styles.seedRow}>
        {XMUSIC_THEME_SEEDS.map((option) => {
          const selected = option.id === activeSeed.id
          return (
            <Pressable
              key={option.id}
              onPress={() => { setThemeId(option.id) }}
              android_ripple={{ color: withAlpha(theme['m3-primary'], 0.14) }}
              accessibilityLabel={t(option.nameKey)}
              accessibilityState={{ selected }}
              style={{
                ...styles.seedBtn,
                backgroundColor: selected ? theme['m3-secondary-container'] : theme['m3-surface-container'],
                borderColor: selected ? theme['m3-primary'] : theme['m3-outline-variant'],
              }}
            >
              <View style={{ ...styles.seedDot, backgroundColor: option.seed }} />
              <Text
                size={12}
                color={selected ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
                style={selected ? styles.seedLabelActive : styles.seedLabel}
              >
                {t(option.nameKey)}
              </Text>
            </Pressable>
          )
        })}
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
  seedRow: {
    marginTop: 10,
    marginRight: 25,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: M3Radius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  seedDot: {
    width: 14,
    height: 14,
    borderRadius: M3Radius.full,
  },
  seedLabel: {
    fontWeight: '400',
  },
  seedLabelActive: {
    fontWeight: '700',
  },
})
