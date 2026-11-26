import { memo } from 'react'
import { useTheme } from '@/store/theme/hook'
import { ExpressiveIconButton } from '@/components/common/m3e/ExpressiveButton'

/**
 * Header action button that opens the "open external playlist link/ID" dialog.
 */
export default memo(({ compact = false }: { compact?: boolean }) => {
  const theme = useTheme()

  return (
    <ExpressiveIconButton
      size={compact ? 34 : 40}
      icon="add_folder"
      iconSize={compact ? 15 : 17}
      backgroundColor={theme['m3-surface-container']}
      color={theme['m3-on-surface-variant']}
      onPress={() => {
        global.app_event.showOpenSonglistModal()
      }}
    />
  )
})
