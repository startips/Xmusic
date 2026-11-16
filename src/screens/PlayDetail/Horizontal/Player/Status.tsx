// import { useLrcPlay } from '@/plugins/lyric'
import { useStatusText } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'


export default () => {
  const theme = useTheme()
  const statusText = useStatusText()

  return <Text style={styles.text} numberOfLines={1} size={12} color={theme['m3-on-surface-variant']}>{statusText}</Text>
}

const styles = createStyle({
  text: {
    textAlign: 'center',
  },
})
