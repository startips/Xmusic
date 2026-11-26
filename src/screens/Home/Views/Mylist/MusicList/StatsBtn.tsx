import { memo } from 'react'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'

/**
 * Header action button displayed on the MyList tab to open listening stats.
 */
export default memo(({ compact = false }: { compact?: boolean }) => {
  const t = useI18n()

  return (
    <ExpressiveButton
      size="sm"
      variant="tonal"
      icon="leaderboard"
      iconSize={compact ? 12 : 13}
      textSize={compact ? 11.5 : 12.5}
      onPress={() => {
        global.app_event.showListeningStatsModal()
      }}
      style={compact ? styles.compactPill : styles.pill}
    >
      {t('stats_entry_btn')}
    </ExpressiveButton>
  )
})

const styles = createStyle({
  pill: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  compactPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
})
