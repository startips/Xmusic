import { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import Popup, { type PopupProps, type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import {
  playTop50SmartPlaylist,
  syncTop50SmartPlaylist,
  useListeningStatsSnapshot,
} from '@/core/listeningStats'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { M3Radius, withAlpha } from '@/theme/m3'
import { hapticConfirm, hapticLight } from '@/utils/haptics'
import { createStyle, toast } from '@/utils/tools'

export interface ListeningStatsModalType {
  show: () => void
}

export interface ListeningStatsModalProps extends Omit<PopupProps, 'children'> {}

const formatDurationDisplay = (seconds: number, t: ReturnType<typeof useI18n>): string => {
  const mins = Math.floor(seconds / 60)
  if (mins < 1) return seconds > 0 ? `${seconds}s` : `0 ${t('stats_unit_min')}`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours <= 0) return `${mins} ${t('stats_unit_min')}`
  return `${hours} ${t('stats_unit_hour')} ${remMins} ${t('stats_unit_min')}`
}

const StatsBody = memo(({ onClose }: { onClose: () => void }) => {
  const t = useI18n()
  const theme = useTheme()
  const [snap] = useListeningStatsSnapshot()

  const playlistName = t('stats_smart_playlist_name')

  const handleSyncPlaylist = useCallback(async() => {
    if (!snap.topTracks.length) {
      toast(t('stats_empty_tip'))
      return
    }
    hapticConfirm()
    const res = await syncTop50SmartPlaylist(playlistName)
    if (res.count > 0) {
      toast(t('stats_synced_toast', { count: res.count }))
      onClose()
    }
  }, [onClose, playlistName, snap.topTracks.length, t])

  const handlePlayTop50 = useCallback(async(index = 0) => {
    if (!snap.topTracks.length) {
      toast(t('stats_empty_tip'))
      return
    }
    hapticLight()
    const ok = await playTop50SmartPlaylist(playlistName, index)
    if (ok && index === 0) {
      onClose()
    }
  }, [onClose, playlistName, snap.topTracks.length, t])

  return (
    <View style={styles.wrapper}>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Metrics Grid */}
          <View style={styles.heroRow}>
            <View style={{ ...styles.heroCard, backgroundColor: withAlpha(theme['m3-primary-container'], 0.68) }}>
              <Text size={11.5} color={theme['m3-on-primary-container']}>
                {t('stats_total_duration')}
              </Text>
              <Text size={17} color={theme['m3-primary']} style={styles.heroValue} numberOfLines={1}>
                {formatDurationDisplay(snap.totalSeconds, t)}
              </Text>
              <Text size={10.5} color={theme['m3-on-surface-variant']}>
                {t('stats_week_prefix')} {formatDurationDisplay(snap.weekSeconds, t)}
              </Text>
            </View>

            <View style={{ ...styles.heroCard, backgroundColor: theme['m3-surface-container-high'] }}>
              <Text size={11.5} color={theme['m3-on-surface-variant']}>
                {t('stats_today_focus')}
              </Text>
              <Text size={17} color={theme['m3-on-surface']} style={styles.heroValue} numberOfLines={1}>
                {formatDurationDisplay(snap.todaySeconds, t)}
              </Text>
              <Text size={10.5} color={theme['m3-on-surface-variant']}>
                {t('stats_total_plays', { count: snap.totalPlays })}
              </Text>
            </View>
          </View>

          {/* Top Artists */}
          {snap.topArtists.length > 0
            ? (
                <View style={styles.block}>
                  <Text size={12.5} color={theme['m3-primary']} style={styles.sectionTitle}>
                    {t('stats_top_artists')}
                  </Text>
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    directionalLockEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.artistScroll}
                    contentContainerStyle={styles.artistRow}
                  >
                    {snap.topArtists.map((a, idx) => (
                      <View
                        key={a.singer}
                        style={{
                          ...styles.artistChip,
                          backgroundColor: idx === 0
                            ? theme['m3-secondary-container']
                            : theme['m3-surface-container-high'],
                        }}
                      >
                        <Text
                          size={12.5}
                          color={idx === 0 ? theme['m3-on-secondary-container'] : theme['m3-on-surface']}
                          style={styles.artistName}
                        >
                          {a.singer}
                        </Text>
                        <Text size={11} color={theme['m3-on-surface-variant']}>
                          {a.plays}×
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )
            : null}

          {/* Top 50 Tracks */}
          <View style={styles.block}>
            <Text size={12.5} color={theme['m3-primary']} style={styles.sectionTitle}>
              {t('stats_top_tracks_title', { count: snap.topTracks.length })}
            </Text>

            {snap.topTracks.length === 0
              ? (
                  <View style={{ ...styles.emptyBox, backgroundColor: theme['m3-surface-container'] }}>
                    <Icon name="music_time" size={24} color={theme['m3-on-surface-variant']} />
                    <Text size={13} color={theme['m3-on-surface-variant']} style={styles.emptyText}>
                      {t('stats_empty_tip')}
                    </Text>
                  </View>
                )
              : (
                  <View style={{ ...styles.trackCard, backgroundColor: theme['m3-surface-container'] }}>
                    {snap.topTracks.slice(0, 20).map((entry, idx) => (
                      <TouchableOpacity
                        key={entry.musicInfo.id}
                        activeOpacity={0.72}
                        onPress={() => { void handlePlayTop50(idx) }}
                        style={styles.trackRow}
                      >
                        <Text
                          size={12.5}
                          color={idx < 3 ? theme['m3-primary'] : theme['m3-on-surface-variant']}
                          style={styles.rankCol}
                        >
                          {idx + 1}
                        </Text>
                        <View style={styles.trackMeta}>
                          <Text size={13.5} numberOfLines={1} color={theme['m3-on-surface']} style={styles.trackName}>
                            {entry.musicInfo.name}
                          </Text>
                          <Text size={11.5} numberOfLines={1} color={theme['m3-on-surface-variant']}>
                            {entry.musicInfo.singer}
                          </Text>
                        </View>
                        <View style={{ ...styles.playCountPill, backgroundColor: theme['m3-surface-container-highest'] }}>
                          <Text size={11} color={theme['m3-primary']} style={styles.countText}>
                            {entry.count > 0 ? `${entry.count}×` : formatDurationDisplay(entry.seconds, t)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
          </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={{ ...styles.bottomBar, borderTopColor: theme['m3-outline-variant'] }}>
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => { void handleSyncPlaylist() }}
          style={{ ...styles.tonalBtn, backgroundColor: theme['m3-secondary-container'] }}
        >
          <Icon name="add-music" size={15} color={theme['m3-on-secondary-container']} />
          <Text size={13} color={theme['m3-on-secondary-container']} style={styles.btnText} numberOfLines={1}>
            {t('stats_sync_playlist_btn')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => { void handlePlayTop50(0) }}
          style={{ ...styles.primaryBtn, backgroundColor: theme['m3-primary'] }}
        >
          <Icon name="play" size={14} color={theme['m3-on-primary']} />
          <Text size={13} color={theme['m3-on-primary']} style={styles.btnText}>
            {t('stats_play_top_btn')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

export default forwardRef<ListeningStatsModalType, ListeningStatsModalProps>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const popupRef = useRef<PopupType>(null)
  const t = useI18n()

  const handleClose = useCallback(() => {
    popupRef.current?.setVisible(false)
  }, [])

  useImperativeHandle(ref, () => ({
    show() {
      setRefreshKey(k => k + 1)
      if (visible) popupRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          popupRef.current?.setVisible(true)
        })
      }
    },
  }))

  return visible
    ? (
        <Popup ref={popupRef} title={t('stats_modal_title')} {...props}>
          <StatsBody key={refreshKey} onClose={handleClose} />
        </Popup>
      )
    : null
})

const styles = createStyle({
  wrapper: {
    maxHeight: 510,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: M3Radius.lg,
    gap: 4,
  },
  heroValue: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  block: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  artistScroll: {
    flexGrow: 0,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  artistChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: M3Radius.full,
  },
  artistName: {
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 28,
    paddingHorizontal: 18,
    borderRadius: M3Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 19,
  },
  trackCard: {
    borderRadius: M3Radius.lg,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  rankCol: {
    width: 24,
    textAlign: 'center',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  trackMeta: {
    flex: 1,
  },
  trackName: {
    fontWeight: '600',
  },
  playCountPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: M3Radius.full,
  },
  countText: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 0.5,
  },
  tonalBtn: {
    flex: 1.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: M3Radius.full,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: M3Radius.full,
  },
  btnText: {
    fontWeight: '700',
  },
})
