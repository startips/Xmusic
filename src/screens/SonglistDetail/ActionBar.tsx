import { memo } from 'react'
import { View } from 'react-native'
import Button from '@/components/common/Button'
import { Icon } from '@/components/common/Icon'

import { createStyle } from '@/utils/tools'
import { pop } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import Text from '@/components/common/Text'
import { handleCollect, handlePlay } from './listAction'
import songlistState from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useListInfo } from './state'
import { M3Radius } from '@/theme/m3'

export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const info = useListInfo()

  const back = () => {
    void pop(commonState.componentIds.songlistDetail!)
  }

  const handlePlayAll = () => {
    if (!songlistState.listDetailInfo.info.name) return
    void handlePlay(info.id, info.source, songlistState.listDetailInfo.list)
  }

  const handleCollection = () => {
    if (!songlistState.listDetailInfo.info.name) return
    void handleCollect(info.id, info.source, songlistState.listDetailInfo.info.name || info.name)
  }

  return (
    <View style={styles.container}>
      <Button
        onPress={back}
        style={{ ...styles.backBtn, backgroundColor: theme['m3-surface-container-highest'] }}
      >
        <Icon name="chevron-left" size={14} color={theme['m3-on-surface']} />
        <Text size={13} style={styles.btnLabel} color={theme['m3-on-surface']}>{t('back')}</Text>
      </Button>
      <Button
        onPress={handleCollection}
        style={{ ...styles.actionBtn, backgroundColor: theme['m3-surface-container-highest'] }}
      >
        <Icon name="love" size={14} color={theme['m3-on-surface']} />
        <Text size={13} style={styles.btnLabel} color={theme['m3-on-surface']}>{t('collect_songlist')}</Text>
      </Button>
      <Button
        onPress={handlePlayAll}
        style={{ ...styles.actionBtn, backgroundColor: theme['m3-primary'] }}
      >
        <Icon name="play" size={13} color={theme['m3-on-primary']} />
        <Text size={13} style={styles.btnLabel} color={theme['m3-on-primary']}>{t('play_all')}</Text>
      </Button>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 14,
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: M3Radius.full,
    gap: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: M3Radius.full,
    gap: 6,
  },
  btnLabel: {
    fontWeight: '600',
  },
})

