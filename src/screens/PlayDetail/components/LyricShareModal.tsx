import { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { findNodeHandle, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'

import Popup, { type PopupProps, type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import { Icon } from '@/components/common/Icon'
import { XmusicMark } from '@/components/common/XmusicMark'
import LinearGradientOverlay from '@/components/common/LinearGradientOverlay'
import { useI18n } from '@/lang'
import { useLrcSet, type Line } from '@/plugins/lyric'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useCoverPalette, useTheme } from '@/store/theme/hook'
import { blendRgb, M3Radius, parseColorToRgb, withAlpha } from '@/theme/m3'
import { hapticConfirm, hapticTick } from '@/utils/haptics'
import { captureViewToPng, saveImageToGallery, shareImage } from '@/utils/nativeModules/utils'
import { createStyle, toast } from '@/utils/tools'

export interface LyricShareModalType {
  show: (initialLineIndex: number) => void
}

export interface LyricShareModalProps extends Omit<PopupProps, 'children'> {}

const MAX_SELECT_LINES = 6

const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`
}

const LyricShareBody = memo(({ initialLine }: { initialLine: number }) => {
  const t = useI18n()
  const theme = useTheme()
  const coverPalette = useCoverPalette()
  const musicInfo = usePlayerMusicInfo()
  const allLines = useLrcSet()
  const posterRef = useRef<View>(null)
  const [busy, setBusy] = useState(false)

  const validLines = useMemo(() => {
    return allLines
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => Boolean(item.text.trim()))
  }, [allLines])

  const [selectedIndices, setSelectedIndices] = useState<number[]>(() => {
    if (allLines[initialLine]?.text.trim()) return [initialLine]
    return validLines.length ? [validLines[0].idx] : []
  })

  const toggleLine = useCallback((idx: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(idx)) {
        if (prev.length <= 1) return prev
        hapticTick()
        return prev.filter(i => i !== idx)
      }
      if (prev.length >= MAX_SELECT_LINES) {
        toast(t('lyric_poster_max_lines', { num: MAX_SELECT_LINES }))
        return prev
      }
      hapticTick()
      return [...prev, idx].sort((a, b) => a - b)
    })
  }, [t])

  const selectedLines: Line[] = useMemo(() => {
    return selectedIndices
      .map(i => allLines[i])
      .filter((l): l is Line => Boolean(l?.text.trim()))
  }, [allLines, selectedIndices])

  const posterColors = useMemo(() => {
    const darkBase = { r: 20, g: 19, b: 25 }
    const seedStr = coverPalette?.[0] ?? theme['m3-primary']
    const secondStr = coverPalette?.[1] ?? theme['m3-tertiary']
    const seedRgb = parseColorToRgb(seedStr)
    const secRgb = parseColorToRgb(secondStr)
    const top = blendRgb(darkBase, seedRgb, 0.46)
    const mid = blendRgb(darkBase, secRgb, 0.28)
    const bot = blendRgb(darkBase, seedRgb, 0.14)
    const accent = blendRgb({ r: 255, g: 255, b: 255 }, seedRgb, 0.65)
    return {
      gradient: [rgbToHex(top.r, top.g, top.b), rgbToHex(mid.r, mid.g, mid.b), rgbToHex(bot.r, bot.g, bot.b)],
      accent: rgbToHex(accent.r, accent.g, accent.b),
    }
  }, [coverPalette, theme])

  // Show neighbor lines starting 1 row above initialLine so the selected line is immediately visible
  const pickerWindow = useMemo(() => {
    const centerPos = validLines.findIndex(v => v.idx === initialLine)
    const pos = centerPos >= 0 ? centerPos : 0
    const start = Math.max(0, pos - 1)
    const end = Math.min(validLines.length, start + 12)
    return validLines.slice(start, end)
  }, [initialLine, validLines])

  const capturePosterFile = useCallback(async(): Promise<string | null> => {
    const node = findNodeHandle(posterRef.current)
    if (!node) return null
    return captureViewToPng(node)
  }, [])

  const handleSharePoster = useCallback(async() => {
    if (busy || !selectedLines.length) return
    setBusy(true)
    hapticConfirm()
    try {
      const path = await capturePosterFile()
      if (!path) throw new Error('capture failed')
      await shareImage(path, t('lyric_poster_share_btn'))
    } catch {
      toast(t('lyric_poster_failed'))
    } finally {
      setBusy(false)
    }
  }, [busy, capturePosterFile, selectedLines.length, t])

  const handleSavePoster = useCallback(async() => {
    if (busy || !selectedLines.length) return
    setBusy(true)
    hapticConfirm()
    try {
      const path = await capturePosterFile()
      if (!path) throw new Error('capture failed')
      await saveImageToGallery(path, musicInfo.name || 'xmusic_lyric')
      toast(t('lyric_poster_saved'))
    } catch {
      toast(t('lyric_poster_failed'))
    } finally {
      setBusy(false)
    }
  }, [busy, capturePosterFile, musicInfo.name, selectedLines.length, t])

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View onStartShouldSetResponder={() => true}>
        <Text size={12} color={theme['m3-on-surface-variant']} style={styles.sectionHint}>
          {t('lyric_poster_select_tip', { count: selectedLines.length, max: MAX_SELECT_LINES })}
        </Text>

        <ScrollView
          horizontal={false}
          nestedScrollEnabled
          style={{ ...styles.pickerBox, backgroundColor: theme['m3-surface-container'] }}
          contentContainerStyle={styles.pickerContent}
        >
          {pickerWindow.map(({ item, idx }) => {
            const checked = selectedIndices.includes(idx)
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.72}
                onPress={() => { toggleLine(idx) }}
                style={{
                  ...styles.pickerRow,
                  backgroundColor: checked ? withAlpha(theme['m3-primary-container'], 0.65) : 'transparent',
                }}
              >
                <Icon
                  name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={16}
                  color={checked ? theme['m3-primary'] : theme['m3-on-surface-variant']}
                />
                <Text
                  size={13}
                  numberOfLines={1}
                  color={checked ? theme['m3-on-surface'] : theme['m3-on-surface-variant']}
                  style={styles.pickerText}
                >
                  {item.text}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Live Capturable Poster Card */}
        <View
          ref={posterRef}
          collapsable={false}
          style={styles.posterCard}
        >
          <LinearGradientOverlay
            pointerEvents="none"
            colors={posterColors.gradient}
            locations={[0, 0.52, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.posterHeader}>
            <Image
              url={musicInfo.pic}
              style={styles.posterCover}
            />
            <View style={styles.posterMeta}>
              <Text size={16} numberOfLines={1} color="#F7F6FA" style={styles.posterSong}>
                {musicInfo.name || 'Xmusic'}
              </Text>
              <Text size={12.5} numberOfLines={1} color="rgba(247, 246, 250, 0.72)" style={styles.posterSinger}>
                {musicInfo.singer || 'Unknown Artist'}
              </Text>
            </View>
          </View>

          <Text size={38} color={posterColors.accent} style={styles.quoteMark}>
            “
          </Text>

          <View style={styles.posterLyricsWrap}>
            {selectedLines.map((line, i) => (
              <View key={i} style={styles.posterLineBlock}>
                <Text size={17} color="#FFFFFF" style={styles.posterLyricLine}>
                  {line.text}
                </Text>
                {line.extendedLyrics[0]
                  ? (
                      <Text size={12.5} color="rgba(255, 255, 255, 0.68)" style={styles.posterTransLine}>
                        {line.extendedLyrics[0]}
                      </Text>
                    )
                  : null}
              </View>
            ))}
          </View>

          <View style={styles.posterFooter}>
            <View style={styles.brandRow}>
              <XmusicMark size={20} />
              <Text size={11.5} color="rgba(255, 255, 255, 0.72)" style={styles.brandLabel}>
                Xmusic · 歌词金句卡
              </Text>
            </View>
            <Text size={10.5} color={posterColors.accent} style={styles.brandTag}>
              M3 EXPRESSIVE
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            disabled={busy}
            activeOpacity={0.78}
            onPress={() => { void handleSavePoster() }}
            style={{
              ...styles.secondaryBtn,
              backgroundColor: theme['m3-secondary-container'],
            }}
          >
            <Icon name="download-2" size={15} color={theme['m3-on-secondary-container']} />
            <Text size={13.5} color={theme['m3-on-secondary-container']} style={styles.btnLabel}>
              {t('lyric_poster_save_btn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={busy}
            activeOpacity={0.78}
            onPress={() => { void handleSharePoster() }}
            style={{
              ...styles.primaryBtn,
              backgroundColor: theme['m3-primary'],
            }}
          >
            <Icon name="share" size={15} color={theme['m3-on-primary']} />
            <Text size={13.5} color={theme['m3-on-primary']} style={styles.btnLabel}>
              {t('lyric_poster_share_btn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
})

export default forwardRef<LyricShareModalType, LyricShareModalProps>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const [seedLine, setSeedLine] = useState(0)
  const [openKey, setOpenKey] = useState(0)
  const popupRef = useRef<PopupType>(null)
  const t = useI18n()

  useImperativeHandle(ref, () => ({
    show(initialLineIndex: number) {
      setSeedLine(Math.max(0, initialLineIndex))
      setOpenKey(k => k + 1)
      if (visible) {
        popupRef.current?.setVisible(true)
      } else {
        setVisible(true)
        requestAnimationFrame(() => {
          popupRef.current?.setVisible(true)
        })
      }
    },
  }))

  return visible
    ? (
        <Popup ref={popupRef} title={t('lyric_poster_title')} {...props}>
          <LyricShareBody key={openKey} initialLine={seedLine} />
        </Popup>
      )
    : null
})

const styles = createStyle({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  sectionHint: {
    marginBottom: 8,
    fontWeight: '600',
  },
  pickerBox: {
    maxHeight: 132,
    borderRadius: M3Radius.lg,
    marginBottom: 14,
  },
  pickerContent: {
    padding: 6,
    gap: 2,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: M3Radius.sm,
  },
  pickerText: {
    flex: 1,
  },
  posterCard: {
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  posterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  posterCover: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  posterMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  posterSong: {
    fontWeight: '700',
  },
  posterSinger: {
    marginTop: 3,
  },
  quoteMark: {
    marginTop: 14,
    marginBottom: -8,
    fontWeight: '800',
    lineHeight: 42,
  },
  posterLyricsWrap: {
    paddingVertical: 8,
    gap: 10,
  },
  posterLineBlock: {
    gap: 2,
  },
  posterLyricLine: {
    fontWeight: '700',
    lineHeight: 25,
    letterSpacing: 0.2,
  },
  posterTransLine: {
    lineHeight: 18,
  },
  posterFooter: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 0.6,
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandLabel: {
    fontWeight: '600',
  },
  brandTag: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: M3Radius.full,
  },
  primaryBtn: {
    flex: 1.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: M3Radius.full,
  },
  btnLabel: {
    fontWeight: '700',
  },
})
