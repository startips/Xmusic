import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import Popup, { type PopupType, type PopupProps } from '@/components/common/Popup'
import { SegmentedCardGroup, SegmentedCardItem } from '@/components/common/m3e/SegmentedCard'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { usePlayMusicInfo, usePlayQualityInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useSourceNames } from '@/store/common/hook'
import { switchPlayQuality } from '@/core/player/player'
import { setPlayAudioFormat } from '@/core/player/playInfo'
import { getAudioFormat, isEmpty } from '@/plugins/player'
import {
  STANDARD_QUALITY_LIST,
  deriveQualityBadge,
  extractOnlineMusicInfo,
  formatAudioTechSummary,
  getOnlineQualityAvailability,
  getQualityShortLabel,
  isQualityDowngraded,
} from '@/utils/quality'
import { createStyle, toast } from '@/utils/tools'
import { hapticTick } from '@/utils/haptics'
import { M3Radius, withAlpha } from '@/theme/m3'

export interface QualityPopupProps extends Omit<PopupProps, 'children'> {}

export interface QualityPopupType {
  show: () => void
}

const getOptionTitleKey = (q: LX.Quality) => {
  switch (q) {
    case 'flac24bit':
      return 'quality_option_flac24bit_title' as const
    case 'flac':
      return 'quality_option_flac_title' as const
    case '320k':
      return 'quality_option_320k_title' as const
    case '128k':
    default:
      return 'quality_option_128k_title' as const
  }
}

const getOptionDescKey = (q: LX.Quality) => {
  switch (q) {
    case 'flac24bit':
      return 'quality_option_flac24bit_desc' as const
    case 'flac':
      return 'quality_option_flac_desc' as const
    case '320k':
      return 'quality_option_320k_desc' as const
    case '128k':
    default:
      return 'quality_option_128k_desc' as const
  }
}

export default forwardRef<QualityPopupType, QualityPopupProps>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const [switchingQuality, setSwitchingQuality] = useState<LX.Quality | null>(null)
  const popupRef = useRef<PopupType>(null)
  const theme = useTheme()
  const t = useI18n()
  const preferredQuality = useSettingValue('player.playQuality')
  const playMusicInfo = usePlayMusicInfo()
  const playQualityInfo = usePlayQualityInfo()
  const sourceNames = useSourceNames()

  const syncNativeFormat = useCallback(() => {
    if (isEmpty()) return
    void getAudioFormat().then((fmt) => {
      if (fmt) setPlayAudioFormat(fmt)
    }).catch(() => {})
  }, [])

  useImperativeHandle(ref, () => ({
    show() {
      syncNativeFormat()
      if (visible) popupRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          popupRef.current?.setVisible(true)
        })
      }
    },
  }))

  const { onHide: propOnHide } = props
  const handleHide = useCallback(() => {
    setVisible(false)
    setSwitchingQuality(null)
    propOnHide?.()
  }, [propOnHide])

  const musicInfo = playMusicInfo.musicInfo
  const onlineInfo = useMemo(() => extractOnlineMusicInfo(musicInfo), [musicInfo])
  const badge = useMemo(
    () => deriveQualityBadge(playQualityInfo, preferredQuality, musicInfo),
    [playQualityInfo, preferredQuality, musicInfo],
  )
  const techSummary = useMemo(
    () => formatAudioTechSummary(playQualityInfo.audioFormat),
    [playQualityInfo.audioFormat],
  )

  const actualSourceName = useMemo(() => {
    const src = playQualityInfo.actualSource
    if (!src || src === 'local') return ''
    return sourceNames[src] || src.toUpperCase()
  }, [playQualityInfo.actualSource, sourceNames])

  const effectiveQuality = badge.effectiveQuality ?? playQualityInfo.actualQuality
  const downgraded = !badge.isLocal && isQualityDowngraded(preferredQuality, effectiveQuality)

  const qualityOptions = useMemo(() => {
    return STANDARD_QUALITY_LIST.map((q) => {
      const avail = onlineInfo
        ? getOnlineQualityAvailability(onlineInfo, q)
        : { quality: q, supported: true, reason: null, size: null }
      return avail
    })
  }, [onlineInfo])

  const handleSelectQuality = useCallback(async(quality: LX.Quality) => {
    if (playQualityInfo.isSwitching || switchingQuality) return
    hapticTick()
    setSwitchingQuality(quality)
    const result = await switchPlayQuality(quality)
    setSwitchingQuality(null)
    const shortLabel = getQualityShortLabel(quality)
    if (result === 'reloaded') {
      toast(t('quality_switched_toast', { quality: shortLabel }))
      popupRef.current?.setVisible(false)
    } else if (result === 'preference_only') {
      toast(t('quality_pref_only_toast', { quality: shortLabel }))
      popupRef.current?.setVisible(false)
    } else if (result === 'failed') {
      toast(t('quality_switch_failed_toast'))
    } else {
      popupRef.current?.setVisible(false)
    }
  }, [playQualityInfo.isSwitching, switchingQuality, t])

  const isSwitching = playQualityInfo.isSwitching || switchingQuality != null

  return visible
    ? (
        <Popup ref={popupRef} title={t('quality_popup_title')} {...props} onHide={handleHide}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sheetBody} onStartShouldSetResponder={() => true}>
              <View
                style={{
                  ...styles.statusCard,
                  backgroundColor: badge.isHighTier
                    ? withAlpha(theme['m3-primary-container'], 0.52)
                    : theme['m3-surface-container'],
                  borderColor: badge.isHighTier
                    ? withAlpha(theme['m3-primary'], 0.28)
                    : theme['m3-outline-variant'],
                }}
              >
                <View style={styles.statusHeader}>
                  <View
                    style={{
                      ...styles.heroEmblem,
                      backgroundColor: badge.isHighTier
                        ? theme['m3-primary']
                        : theme['m3-surface-container-highest'],
                    }}
                  >
                    <Text
                      size={badge.label.length >= 4 ? 12 : 14}
                      color={badge.isHighTier ? theme['m3-on-primary'] : theme['m3-on-surface']}
                      style={styles.heroEmblemText}
                      numberOfLines={1}
                    >
                      {badge.label}
                    </Text>
                  </View>

                  <View style={styles.statusMeta}>
                    <View style={styles.statusTitleRow}>
                      <Text size={13.5} color={theme['m3-on-surface']} style={styles.statusTitle} numberOfLines={1}>
                        {badge.isLocal ? t('quality_local_label') : t('quality_current_label')}
                      </Text>
                      {actualSourceName
                        ? (
                            <View
                              style={{
                                ...styles.sourceChip,
                                backgroundColor: withAlpha(theme['m3-surface-container-highest'], 0.85),
                              }}
                            >
                              <Text size={10.5} color={theme['m3-on-surface-variant']} numberOfLines={1}>
                                {actualSourceName}
                              </Text>
                            </View>
                          )
                        : null}
                    </View>

                    <Text
                      size={12}
                      color={techSummary ? theme['m3-on-surface-variant'] : withAlpha(theme['m3-on-surface-variant'], 0.72)}
                      style={styles.techText}
                      numberOfLines={2}
                    >
                      {isSwitching
                        ? t('quality_switching')
                        : (techSummary || (badge.isLocal
                            ? t('quality_decoding_pending')
                            : t(getOptionDescKey(effectiveQuality ?? preferredQuality))))}
                    </Text>
                  </View>
                </View>

                {badge.isFakeLossless && techSummary
                  ? (
                      <View
                        style={{
                          ...styles.noticePill,
                          backgroundColor: withAlpha(theme['m3-error-container'], 0.65),
                        }}
                      >
                        <Text size={11.5} color={theme['m3-on-error-container']}>
                          {t('quality_fake_lossless_tip', { detail: techSummary })}
                        </Text>
                      </View>
                    )
                  : downgraded && effectiveQuality
                    ? (
                        <View
                          style={{
                            ...styles.noticePill,
                            backgroundColor: withAlpha(theme['m3-surface-container-highest'], 0.8),
                          }}
                        >
                          <Text size={11.5} color={theme['m3-on-surface-variant']}>
                            {t('quality_downgrade_tip', {
                              target: getQualityShortLabel(preferredQuality),
                              actual: getQualityShortLabel(effectiveQuality),
                            })}
                          </Text>
                        </View>
                      )
                    : null}

                {playQualityInfo.isSourceToggled && actualSourceName
                  ? (
                      <View
                        style={{
                          ...styles.noticePill,
                          backgroundColor: withAlpha(theme['m3-secondary-container'], 0.65),
                        }}
                      >
                        <Text size={11.5} color={theme['m3-on-secondary-container']}>
                          {t('quality_toggle_source_tip', { source: actualSourceName })}
                        </Text>
                      </View>
                    )
                  : null}

                {badge.isLocal
                  ? (
                      <Text size={11.5} color={theme['m3-on-surface-variant']} style={styles.localHint}>
                        {t('quality_local_tip')}
                      </Text>
                    )
                  : null}
              </View>

              {!badge.isLocal
                ? (
                    <View style={styles.section}>
                      <Text size={12} color={theme['m3-on-surface-variant']} style={styles.sectionLabel}>
                        {t('quality_select_title')}
                      </Text>
                      <SegmentedCardGroup>
                        {qualityOptions.map((item, index) => {
                          const isPreferred = preferredQuality === item.quality
                          const isActualPlaying = Boolean(onlineInfo) && effectiveQuality === item.quality
                          const isRowSwitching = switchingQuality === item.quality
                          const shortLabel = getQualityShortLabel(item.quality)
                          const isHigh = item.quality === 'flac24bit' || item.quality === 'flac'
                          const descText = item.supported
                            ? t(getOptionDescKey(item.quality))
                            : t(item.reason === 'source_unsupported' ? 'quality_unsupported_source' : 'quality_unsupported_track')

                          return (
                            <SegmentedCardItem
                              key={item.quality}
                              index={index}
                              count={qualityOptions.length}
                              backgroundColor={isPreferred
                                ? withAlpha(theme['m3-primary-container'], 0.42)
                                : theme['m3-surface-container']}
                            >
                              <Pressable
                                style={({ pressed }) => [
                                  styles.optionRow,
                                  !item.supported && styles.optionRowDimmed,
                                  pressed && { backgroundColor: withAlpha(theme['m3-on-surface'], 0.06) },
                                ]}
                                onPress={() => { void handleSelectQuality(item.quality) }}
                              >
                                <View
                                  style={{
                                    ...styles.optionBadge,
                                    backgroundColor: isPreferred || isActualPlaying
                                      ? theme['m3-primary-container']
                                      : theme['m3-surface-container-high'],
                                    borderColor: isHigh && item.supported
                                      ? withAlpha(theme['m3-primary'], 0.45)
                                      : withAlpha(theme['m3-outline-variant'], 0.65),
                                  }}
                                >
                                  <Text
                                    size={shortLabel.length >= 4 ? 10 : 11}
                                    color={isPreferred || isActualPlaying || (isHigh && item.supported)
                                      ? theme['m3-primary']
                                      : theme['m3-on-surface-variant']}
                                    style={styles.optionBadgeText}
                                    numberOfLines={1}
                                  >
                                    {shortLabel}
                                  </Text>
                                </View>

                                <View style={styles.optionContent}>
                                  <View style={styles.optionTitleRow}>
                                    <Text
                                      size={14}
                                      color={theme['m3-on-surface']}
                                      style={styles.optionTitle}
                                      numberOfLines={1}
                                    >
                                      {t(getOptionTitleKey(item.quality))}
                                    </Text>
                                    {isActualPlaying
                                      ? (
                                          <View
                                            style={{
                                              ...styles.inlineTag,
                                              backgroundColor: theme['m3-primary'],
                                            }}
                                          >
                                            <Text size={9.5} color={theme['m3-on-primary']} style={styles.inlineTagText}>
                                              {t('quality_badge_playing')}
                                            </Text>
                                          </View>
                                        )
                                      : isPreferred
                                        ? (
                                            <View
                                              style={{
                                                ...styles.inlineTag,
                                                backgroundColor: theme['m3-secondary-container'],
                                              }}
                                            >
                                              <Text size={9.5} color={theme['m3-on-secondary-container']} style={styles.inlineTagText}>
                                                {t('quality_badge_preferred')}
                                              </Text>
                                            </View>
                                          )
                                        : null}
                                  </View>

                                  <Text
                                    size={11.5}
                                    color={theme['m3-on-surface-variant']}
                                    style={styles.optionDesc}
                                    numberOfLines={2}
                                  >
                                    {descText}
                                  </Text>
                                </View>

                                <View style={styles.optionTrailing}>
                                  {item.supported && item.size
                                    ? (
                                        <Text
                                          size={11}
                                          color={theme['m3-on-surface-variant']}
                                          style={styles.sizeLabel}
                                          numberOfLines={1}
                                        >
                                          {item.size}
                                        </Text>
                                      )
                                    : null}
                                  {isRowSwitching
                                    ? <ActivityIndicator size="small" color={theme['m3-primary']} />
                                    : (
                                        <View
                                          style={{
                                            ...styles.radioOuter,
                                            borderColor: isPreferred ? theme['m3-primary'] : theme['m3-outline'],
                                          }}
                                        >
                                          {isPreferred
                                            ? <View style={{ ...styles.radioInner, backgroundColor: theme['m3-primary'] }} />
                                            : null}
                                        </View>
                                      )}
                                </View>
                              </Pressable>
                            </SegmentedCardItem>
                          )
                        })}
                      </SegmentedCardGroup>
                    </View>
                  )
                : null}
            </View>
          </ScrollView>
        </Popup>
      )
    : null
})

const styles = createStyle({
  sheetBody: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 12,
    gap: 12,
  },
  statusCard: {
    borderRadius: M3Radius.lg,
    borderWidth: 0.75,
    padding: 14,
    gap: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroEmblem: {
    minWidth: 52,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmblemText: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusMeta: {
    flex: 1,
    gap: 3,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTitle: {
    fontWeight: '700',
  },
  sourceChip: {
    borderRadius: M3Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  techText: {
    fontVariant: ['tabular-nums'],
  },
  noticePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  localHint: {
    marginTop: -2,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  optionRowDimmed: {
    opacity: 0.62,
  },
  optionBadge: {
    width: 44,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  optionContent: {
    flex: 1,
    gap: 2,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontWeight: '600',
  },
  inlineTag: {
    borderRadius: M3Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  inlineTagText: {
    fontWeight: '700',
  },
  optionDesc: {
    fontVariant: ['tabular-nums'],
  },
  optionTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  sizeLabel: {
    fontVariant: ['tabular-nums'],
  },
  radioOuter: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
})
