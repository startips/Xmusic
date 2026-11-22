import { memo } from 'react'
import { View } from 'react-native'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'
import { createStyle } from '@/utils/tools'
import { pop } from '@/navigation'
import commonState from '@/store/common/state'
import { handleCollect, handlePlay } from './listAction'
import songlistState from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useListInfo } from './state'

export default memo(() => {
  const t = useI18n()
  const info = useListInfo()

  const back = () => {
    if (!commonState.componentIds.songlistDetail) return
    void pop(commonState.componentIds.songlistDetail)
  }

  const handlePlayAll = () => {
    if (!songlistState.listDetailInfo.list.length && !info.id) return
    void handlePlay(info.id, info.source, songlistState.listDetailInfo.list)
  }

  const handleCollection = () => {
    if (!songlistState.listDetailInfo.list.length && !info.id) return
    const fallbackName = info.name ?? info.id
    void handleCollect(info.id, info.source, songlistState.listDetailInfo.info.name ? songlistState.listDetailInfo.info.name : fallbackName)
  }

  return (
    <View style={styles.container}>
      <ExpressiveButton
        variant="surface"
        size="md"
        icon="chevron-left"
        iconSize={13}
        textSize={13}
        onPress={back}
        style={styles.backBtn}
      >
        {t('back')}
      </ExpressiveButton>
      <View style={styles.splitGroup}>
        <ExpressiveButton
          variant="secondary"
          size="md"
          icon="love"
          iconSize={13.5}
          textSize={13}
          rightRadius={8}
          pressRadius={12}
          onPress={handleCollection}
          style={styles.collectBtn}
        >
          {t('collect_songlist')}
        </ExpressiveButton>
        <ExpressiveButton
          variant="filled"
          size="md"
          icon="play"
          iconSize={13}
          textSize={13}
          leftRadius={8}
          pressRadius={12}
          onPress={handlePlayAll}
          style={styles.playAllBtn}
        >
          {t('play_all')}
        </ExpressiveButton>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 14,
    gap: 8,
  },
  backBtn: {
    paddingHorizontal: 14,
  },
  splitGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  collectBtn: {
    flex: 1,
    paddingHorizontal: 10,
  },
  playAllBtn: {
    flex: 1.15,
    paddingHorizontal: 12,
  },
})
