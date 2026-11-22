import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { pop } from '@/navigation'
import StatusBar from '@/components/common/StatusBar'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import { useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'

const TOP_BAR_HEIGHT = scaleSizeH(50)

export default memo(({ musicInfo, onBack }: {
  musicInfo: LX.Music.MusicInfo
  onBack?: () => void
}) => {
  const t = useI18n()
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()

  const back = () => {
    if (onBack) {
      onBack()
      return
    }
    if (!commonState.componentIds.comment) return
    void pop(commonState.componentIds.comment)
  }

  return (
    <View style={{ height: TOP_BAR_HEIGHT + statusBarHeight, paddingTop: statusBarHeight }}>
      <StatusBar />
      <View style={styles.container}>
        <TouchableOpacity
          onPress={back}
          activeOpacity={0.7}
          style={{ ...styles.button, backgroundColor: theme['m3-surface-container'] }}
        >
          <Icon name="chevron-left" size={16} color={theme['m3-on-surface']} />
        </TouchableOpacity>
        <Text numberOfLines={1} size={17} color={theme['m3-on-surface']} style={styles.title}>
          {t('comment_title', { name: musicInfo.name, singer: musicInfo.singer })}
        </Text>
        <View style={styles.rightSpacer} />
      </View>
    </View>
  )
})


const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 14,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: M3Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  rightSpacer: {
    width: 36,
  },
})
