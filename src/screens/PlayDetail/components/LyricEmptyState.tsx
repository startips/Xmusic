import { memo } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { type LyricStatus } from '@/store/player/state'
import { useTheme } from '@/store/theme/hook'
import { M3Radius, withAlpha } from '@/theme/m3'
import { hapticTick } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

interface LyricEmptyStateProps {
  status: LyricStatus
  hasTrack: boolean
  onRetry?: () => void
}

export default memo(({ status, hasTrack, onRetry }: LyricEmptyStateProps) => {
  const t = useI18n()
  const theme = useTheme()

  const isLoading = status === 'loading'
  const isError = status === 'error'

  const title = isLoading
    ? t('lyric__loading')
    : isError
      ? t('lyric__load_error')
      : t('lyric__empty_title')

  const subtitle = isLoading
    ? null
    : isError
      ? t('lyric__error_desc')
      : t('lyric__empty_desc')

  const handleRetry = () => {
    if (!onRetry) return
    hapticTick()
    onRetry()
  }

  return (
    <View style={styles.container}>
      <View
        style={{
          ...styles.iconBadge,
          backgroundColor: withAlpha(theme['m3-primary'], theme.isDark ? 0.16 : 0.11),
          borderColor: withAlpha(theme['m3-primary'], 0.22),
        }}
      >
        {isLoading
          ? <ActivityIndicator size="small" color={theme['m3-primary']} />
          : <Icon name="lyric-off" size={26} color={theme['m3-primary']} />}
      </View>

      <Text size={17} color={theme['m3-on-surface']} style={styles.title}>
        {title}
      </Text>

      {subtitle != null && (
        <Text size={13.5} color={theme['m3-on-surface-variant']} style={styles.subtitle}>
          {subtitle}
        </Text>
      )}

      {!isLoading && hasTrack && onRetry != null && (
        <Pressable
          onPress={handleRetry}
          android_ripple={{ color: withAlpha(theme['m3-primary'], 0.18), borderless: false }}
          style={{
            ...styles.retryBtn,
            backgroundColor: withAlpha(theme['m3-primary'], theme.isDark ? 0.2 : 0.12),
            borderColor: withAlpha(theme['m3-primary'], 0.28),
          }}
        >
          <Text size={13.5} color={theme['m3-primary']} style={styles.retryText}>
            {t('lyric__retry')}
          </Text>
        </Pressable>
      )}
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: M3Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.84,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: M3Radius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  retryText: {
    fontWeight: '600',
  },
})
