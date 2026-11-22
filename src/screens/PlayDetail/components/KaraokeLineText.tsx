import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { type TextStyle } from 'react-native'

import Text from '@/components/common/Text'
import playerState from '@/store/player/state'
import { useTheme } from '@/store/theme/hook'
import { blendRgb, parseColorToRgb, withAlpha } from '@/theme/m3'
import { type KaraokeToken } from '@/utils/karaokeLyric'

// Matches lrcTools's 100ms lead offset in src/plugins/lyric.ts
const LYRIC_LEAD_MS = 100
const QUANT_STEPS = 5

interface KaraokeLineTextProps {
  tokens: KaraokeToken[]
  lineStartMs: number
  size: number
  style: TextStyle
}

/**
 * Renders the single active lyric line with smooth word-by-word karaoke sweep.
 *
 * Uses a quantized syllable-state signature so React only reconciles the
 * nested <Text> spans when a character's visual highlight step actually advances
 * (0 reconciliations during held notes or pauses).
 */
export default memo(({ tokens, lineStartMs, size, style }: KaraokeLineTextProps) => {
  const theme = useTheme()
  const anchorRef = useRef({
    mediaMs: playerState.progress.nowPlayTime * 1000,
    wallMs: Date.now(),
    isPlay: playerState.isPlay,
    rate: playerState.playRate || 1,
  })

  const computeSignature = (elapsedInLineMs: number): string => {
    let out = ''
    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i]
      let step: number
      if (elapsedInLineMs <= tk.startMs) {
        step = 0
      } else if (elapsedInLineMs >= tk.startMs + tk.durationMs) {
        step = QUANT_STEPS
      } else {
        const ratio = (elapsedInLineMs - tk.startMs) / tk.durationMs
        step = Math.min(QUANT_STEPS, Math.max(0, Math.round(ratio * QUANT_STEPS)))
      }
      out += i === 0 ? `${step}` : `,${step}`
    }
    return out
  }

  const [stepSig, setStepSig] = useState<string>(() => {
    const initialElapsed = playerState.progress.nowPlayTime * 1000 + LYRIC_LEAD_MS - lineStartMs
    return computeSignature(initialElapsed)
  })
  const lastSigRef = useRef(stepSig)

  useEffect(() => {
    anchorRef.current = {
      mediaMs: playerState.progress.nowPlayTime * 1000,
      wallMs: Date.now(),
      isPlay: playerState.isPlay,
      rate: playerState.playRate || 1,
    }

    let rafId: number | null = null
    let lastTickWall = 0

    const updateOnce = (nowWall: number) => {
      const a = anchorRef.current
      const curMediaMs = a.isPlay
        ? a.mediaMs + (nowWall - a.wallMs) * a.rate
        : a.mediaMs
      const elapsed = curMediaMs + LYRIC_LEAD_MS - lineStartMs
      const nextSig = computeSignature(elapsed)
      if (nextSig !== lastSigRef.current) {
        lastSigRef.current = nextSig
        setStepSig(nextSig)
      }
    }

    const loop = () => {
      const now = Date.now()
      if (now - lastTickWall >= 32) {
        lastTickWall = now
        updateOnce(now)
      }
      if (anchorRef.current.isPlay) {
        rafId = requestAnimationFrame(loop)
      } else {
        rafId = null
      }
    }

    const startLoopIfPlaying = () => {
      if (anchorRef.current.isPlay && rafId == null) {
        rafId = requestAnimationFrame(loop)
      }
    }

    const handleProgress = (prog: typeof playerState.progress) => {
      const now = Date.now()
      anchorRef.current.mediaMs = prog.nowPlayTime * 1000
      anchorRef.current.wallMs = now
      anchorRef.current.rate = playerState.playRate || 1
      updateOnce(now)
    }

    const handlePlayState = (playing: boolean) => {
      const now = Date.now()
      anchorRef.current.mediaMs = playerState.progress.nowPlayTime * 1000
      anchorRef.current.wallMs = now
      anchorRef.current.isPlay = playing
      anchorRef.current.rate = playerState.playRate || 1
      updateOnce(now)
      if (playing) startLoopIfPlaying()
      else if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    updateOnce(Date.now())
    startLoopIfPlaying()

    global.state_event.on('playProgressChanged', handleProgress)
    global.state_event.on('playStateChanged', handlePlayState)

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      global.state_event.off('playProgressChanged', handleProgress)
      global.state_event.off('playStateChanged', handlePlayState)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineStartMs, tokens])

  const stepPalette = useMemo(() => {
    const sungRgb = parseColorToRgb(theme['m3-primary'])
    const unsungBase = parseColorToRgb(theme['m3-on-surface'])
    const colors: string[] = []
    for (let s = 0; s <= QUANT_STEPS; s++) {
      if (s === 0) {
        colors.push(withAlpha(theme['m3-on-surface'], theme.isDark ? 0.48 : 0.44))
      } else if (s === QUANT_STEPS) {
        colors.push(theme['m3-primary'])
      } else {
        const ratio = s / QUANT_STEPS
        const mixed = blendRgb(unsungBase, sungRgb, 0.35 + ratio * 0.65)
        const alpha = 0.56 + ratio * 0.44
        colors.push(`rgba(${Math.round(mixed.r)}, ${Math.round(mixed.g)}, ${Math.round(mixed.b)}, ${alpha.toFixed(2)})`)
      }
    }
    return colors
  }, [theme])

  const steps = useMemo(() => stepSig.split(',').map(v => parseInt(v, 10) || 0), [stepSig])

  return (
    <Text style={style} textBreakStrategy="simple" size={size} color={stepPalette[0]}>
      {tokens.map((tk, idx) => {
        const st = steps[idx] ?? 0
        return (
          <Text key={idx} size={size} color={stepPalette[st] ?? stepPalette[0]} style={styles.wordSpan}>
            {tk.text}
          </Text>
        )
      })}
    </Text>
  )
})

const styles: Record<string, TextStyle> = {
  wordSpan: {
    fontWeight: '700',
  },
}
