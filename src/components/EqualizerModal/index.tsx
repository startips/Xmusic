import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'

import Popup, { type PopupProps, type PopupType } from '@/components/common/Popup'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'
import ExpressiveSwitch from '@/components/common/m3e/ExpressiveSwitch'
import Slider from '@/components/common/Slider'
import Text from '@/components/common/Text'
import {
  EQ_PRESET_LEVELS,
  EQ_PRESET_LIST,
  parseEqBands,
  serializeEqBands,
  type EqPresetId,
} from '@/core/audioEffects'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { M3Radius, withAlpha } from '@/theme/m3'
import { hapticTick } from '@/utils/haptics'
import { getNativeEffectInfo, syncNativeAudioSession, type EqBandInfo } from '@/utils/nativeModules/audioEffect'
import { createStyle } from '@/utils/tools'

export interface EqualizerModalType {
  show: () => void
}

export interface EqualizerModalProps extends Omit<PopupProps, 'children'> {}

const formatFreq = (hz: number): string => {
  if (hz >= 1000) {
    const khz = hz / 1000
    return `${Number.isInteger(khz) ? khz : khz.toFixed(1)}kHz`
  }
  return `${hz}Hz`
}

const formatDb = (mb: number): string => {
  const db = mb / 100
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`
}

const BandRow = memo(({
  freqHz,
  valueMb,
  minMb,
  maxMb,
  disabled,
  onCommit,
}: {
  freqHz: number
  valueMb: number
  minMb: number
  maxMb: number
  disabled: boolean
  onCommit: (nextMb: number) => void
}) => {
  const theme = useTheme()
  const [slidingVal, setSlidingVal] = useState(valueMb)
  const [isSliding, setSliding] = useState(false)

  useEffect(() => {
    if (!isSliding) setSlidingVal(valueMb)
  }, [isSliding, valueMb])

  const shown = isSliding ? slidingVal : valueMb

  return (
    <View style={{ ...styles.bandRow, opacity: disabled ? 0.45 : 1 }}>
      <View style={styles.bandLabelCol}>
        <Text size={13} color={theme['m3-on-surface']} style={styles.freqText}>
          {formatFreq(freqHz)}
        </Text>
        <Text size={11.5} color={theme['m3-primary']} style={styles.dbText}>
          {formatDb(shown)}
        </Text>
      </View>
      <Slider
        disabled={disabled}
        minimumValue={minMb}
        maximumValue={maxMb}
        step={50}
        value={valueMb}
        onSlidingStart={() => { setSliding(true) }}
        onValueChange={setSlidingVal}
        onSlidingComplete={(val) => {
          setSliding(false)
          onCommit(Math.round(val))
        }}
      />
    </View>
  )
})

const EqualizerBody = () => {
  const t = useI18n()
  const theme = useTheme()
  const eqEnabled = useSettingValue('player.eqEnabled')
  const eqPreset = useSettingValue('player.eqPreset')
  const eqBandsRaw = useSettingValue('player.eqBands')
  const bassBoost = useSettingValue('player.bassBoost')
  const loudnessGain = useSettingValue('player.loudnessGain')

  const [bandDefs, setBandDefs] = useState<EqBandInfo[]>([
    { index: 0, centerFreqHz: 60, level: 0 },
    { index: 1, centerFreqHz: 230, level: 0 },
    { index: 2, centerFreqHz: 910, level: 0 },
    { index: 3, centerFreqHz: 3600, level: 0 },
    { index: 4, centerFreqHz: 14000, level: 0 },
  ])
  const [range, setRange] = useState({ min: -1500, max: 1500 })
  const [bassSlider, setBassSlider] = useState(bassBoost)
  const [bassSliding, setBassSliding] = useState(false)
  const [loudSlider, setLoudSlider] = useState(loudnessGain)
  const [loudSliding, setLoudSliding] = useState(false)

  useEffect(() => {
    void syncNativeAudioSession().then(async() => getNativeEffectInfo()).then((info) => {
      if (info.bands.length) setBandDefs(info.bands)
      setRange({ min: info.minLevel, max: info.maxLevel })
    })
  }, [])

  const levels = parseEqBands(eqBandsRaw, bandDefs.length)

  const handleToggleEnable = (nextEnabled: boolean) => {
    updateSetting({ 'player.eqEnabled': nextEnabled })
  }

  const handleSelectPreset = (preset: EqPresetId) => {
    hapticTick()
    if (preset == 'custom') {
      updateSetting({ 'player.eqEnabled': true, 'player.eqPreset': 'custom' })
      return
    }
    const base = EQ_PRESET_LEVELS[preset]
    const mapped = bandDefs.map((_, idx) => base[Math.min(idx, base.length - 1)] ?? 0)
    updateSetting({
      'player.eqEnabled': true,
      'player.eqPreset': preset,
      'player.eqBands': serializeEqBands(mapped),
    })
  }

  const handleBandCommit = useCallback((idx: number, nextMb: number) => {
    hapticTick()
    const current = parseEqBands(eqBandsRaw, bandDefs.length)
    current[idx] = nextMb
    updateSetting({
      'player.eqEnabled': true,
      'player.eqPreset': 'custom',
      'player.eqBands': serializeEqBands(current),
    })
  }, [bandDefs.length, eqBandsRaw])

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.container} onStartShouldSetResponder={() => true}>
        <View
          style={{
            ...styles.masterRow,
            backgroundColor: eqEnabled
              ? withAlpha(theme['m3-primary-container'], 0.65)
              : theme['m3-surface-container-high'],
          }}
        >
          <View style={styles.masterInfo}>
            <Text size={14.5} color={theme['m3-on-surface']} style={styles.masterTitle}>
              {t('eq_enable_label')}
            </Text>
            <Text size={12} color={theme['m3-on-surface-variant']}>
              {t('eq_enable_desc')}
            </Text>
          </View>
          <ExpressiveSwitch value={eqEnabled} onValueChange={handleToggleEnable} />
        </View>

        <Text size={13} color={theme['m3-on-surface-variant']} style={styles.sectionTitle}>
          {t('eq_presets')}
        </Text>
        <View style={styles.presetWrap}>
          {EQ_PRESET_LIST.map((preset) => {
            const active = eqPreset == preset
            return (
              <ExpressiveButton
                key={preset}
                size="sm"
                variant={active ? 'tonal' : 'surface'}
                leftRadius={active ? 16 : 10}
                rightRadius={active ? 16 : 10}
                pressRadius={8}
                textSize={12.5}
                onPress={() => { handleSelectPreset(preset) }}
                style={{ paddingHorizontal: 13, paddingVertical: 6 }}
                textStyle={{ fontWeight: active ? '700' : '500' }}
              >
                {t(`eq_preset_${preset}`)}
              </ExpressiveButton>
            )
          })}
        </View>

        <Text size={13} color={theme['m3-on-surface-variant']} style={styles.sectionTitle}>
          {t('eq_bands_title')}
        </Text>
        <View style={{ ...styles.card, backgroundColor: theme['m3-surface-container'] }}>
          {bandDefs.map((b, idx) => (
            <BandRow
              key={b.index}
              freqHz={b.centerFreqHz}
              valueMb={levels[idx] ?? 0}
              minMb={range.min}
              maxMb={range.max}
              disabled={!eqEnabled}
              onCommit={(val) => { handleBandCommit(idx, val) }}
            />
          ))}
        </View>

        <Text size={13} color={theme['m3-on-surface-variant']} style={styles.sectionTitle}>
          {t('eq_enhance_title')}
        </Text>
        <View style={{ ...styles.card, backgroundColor: theme['m3-surface-container'], opacity: eqEnabled ? 1 : 0.45 }}>
          <View style={styles.bandRow}>
            <View style={styles.bandLabelCol}>
              <Text size={13} color={theme['m3-on-surface']} style={styles.freqText}>
                {t('eq_bass_boost')}
              </Text>
              <Text size={11.5} color={theme['m3-primary']} style={styles.dbText}>
                {Math.round((bassSliding ? bassSlider : bassBoost) / 10)}%
              </Text>
            </View>
            <Slider
              disabled={!eqEnabled}
              minimumValue={0}
              maximumValue={1000}
              step={25}
              value={bassBoost}
              onSlidingStart={() => { setBassSliding(true) }}
              onValueChange={setBassSlider}
              onSlidingComplete={(val) => {
                setBassSliding(false)
                hapticTick()
                updateSetting({ 'player.bassBoost': Math.round(val) })
              }}
            />
          </View>

          <View style={styles.bandRow}>
            <View style={styles.bandLabelCol}>
              <Text size={13} color={theme['m3-on-surface']} style={styles.freqText}>
                {t('eq_loudness_gain')}
              </Text>
              <Text size={11.5} color={theme['m3-primary']} style={styles.dbText}>
                +{((loudSliding ? loudSlider : loudnessGain) / 100).toFixed(1)} dB
              </Text>
            </View>
            <Slider
              disabled={!eqEnabled}
              minimumValue={0}
              maximumValue={1000}
              step={50}
              value={loudnessGain}
              onSlidingStart={() => { setLoudSliding(true) }}
              onValueChange={setLoudSlider}
              onSlidingComplete={(val) => {
                setLoudSliding(false)
                hapticTick()
                updateSetting({ 'player.loudnessGain': Math.round(val) })
              }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

export default forwardRef<EqualizerModalType, EqualizerModalProps>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const popupRef = useRef<PopupType>(null)
  const t = useI18n()

  useImperativeHandle(ref, () => ({
    show() {
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
        <Popup ref={popupRef} title={t('eq_title')} {...props}>
          <EqualizerBody />
        </Popup>
      )
    : null
})

const styles = createStyle({
  scroll: {
    maxHeight: 520,
  },
  container: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: M3Radius.lg,
    gap: 12,
  },
  masterInfo: {
    flex: 1,
    gap: 2,
  },
  masterTitle: {
    fontWeight: '700',
  },
  sectionTitle: {
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    borderRadius: M3Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  bandLabelCol: {
    width: 68,
  },
  freqText: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dbText: {
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
})
