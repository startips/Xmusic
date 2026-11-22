import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, View, type ViewStyle } from 'react-native'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { createStyle } from '@/utils/tools'
import { M3Motion, M3Radius, withAlpha } from '@/theme/m3'

export type SelectMode = 'single' | 'range'

export interface MultiSelectBarProps {
  onSwitchMode: (mode: SelectMode) => void
  onSelectAll: (isAll: boolean) => void
  onExitSelectMode: () => void
  onPlayLater?: () => void
  onAdd?: () => void
  onRemove?: () => void
  slideFrom?: number
  wrapperStyle?: ViewStyle
  barStyle?: ViewStyle
}

export interface MultiSelectBarType {
  show: () => void
  setVisibleBar: (visible: boolean) => void
  setIsSelectAll: (isAll: boolean) => void
  setSwitchMode: (mode: SelectMode) => void
  exitSelectMode: () => void
}

const MODES: readonly SelectMode[] = ['single', 'range']

export default forwardRef<MultiSelectBarType, MultiSelectBarProps>(({
  onSelectAll,
  onSwitchMode,
  onExitSelectMode,
  onPlayLater,
  onAdd,
  onRemove,
  slideFrom = -18,
  wrapperStyle,
  barStyle,
}, ref) => {
  const [visible, setVisible] = useState(false)
  const [animatePlayed, setAnimatePlayed] = useState(true)
  const animFade = useRef(new Animated.Value(0)).current
  const animTranslateY = useRef(new Animated.Value(0)).current
  const rafRef = useRef<number | null>(null)
  const [selectMode, setSelectMode] = useState<SelectMode>('single')
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [visibleBar, setVisibleBar] = useState(true)
  const theme = useTheme()
  const t = useI18n()

  useBackHandler(useCallback(() => {
    if (!visible || !visibleBar) return false
    onExitSelectMode()
    return true
  }, [onExitSelectMode, visible, visibleBar]))

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleShow = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    setVisible(true)
    setAnimatePlayed(false)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      animFade.stopAnimation()
      animTranslateY.stopAnimation()
      animTranslateY.setValue(slideFrom)

      Animated.parallel([
        Animated.timing(animFade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(animTranslateY, {
          toValue: 0,
          ...M3Motion.spatialFast,
        }),
      ]).start((res) => {
        if (res.finished) setAnimatePlayed(true)
      })
    })
  }, [animFade, animTranslateY, slideFrom])

  const handleHide = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    animFade.stopAnimation()
    animTranslateY.stopAnimation()
    setAnimatePlayed(false)
    Animated.parallel([
      Animated.timing(animFade, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(animTranslateY, {
        toValue: slideFrom,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(res => {
      if (!res.finished) return
      setVisible(false)
      setAnimatePlayed(true)
    })
  }, [animFade, animTranslateY, slideFrom])

  useImperativeHandle(ref, () => ({
    show() {
      handleShow()
    },
    setVisibleBar(nextVisible) {
      setVisibleBar(nextVisible)
    },
    setIsSelectAll(isAll) {
      setIsSelectAll(isAll)
    },
    setSwitchMode(mode: SelectMode) {
      setSelectMode(mode)
    },
    exitSelectMode() {
      handleHide()
    },
  }), [handleHide, handleShow])

  const handleSelectAll = useCallback(() => {
    const nextSelectAll = !isSelectAll
    setIsSelectAll(nextSelectAll)
    onSelectAll(nextSelectAll)
  }, [isSelectAll, onSelectAll])

  const rippleColor = useMemo(() => withAlpha(theme['m3-primary'], 0.14), [theme])

  const animatedStyle = useMemo(() => ({
    ...styles.container,
    ...barStyle,
    backgroundColor: theme['m3-surface-container-high'],
    borderColor: theme['m3-outline-variant'],
    opacity: visibleBar ? animFade : 0,
    transform: [{ translateY: animTranslateY }],
  }), [animFade, animTranslateY, barStyle, theme, visibleBar])

  if (!visible && animatePlayed) return null

  return (
    <View style={{ ...styles.overlayWrap, ...wrapperStyle }} pointerEvents={visibleBar ? 'box-none' : 'none'}>
      <Animated.View style={animatedStyle} pointerEvents={visibleBar ? 'auto' : 'none'}>
        <View style={styles.leftGroup}>
          <View style={{ ...styles.segmentedGroup, backgroundColor: theme['m3-surface-container'] }}>
            {MODES.map((mode) => {
              const active = selectMode === mode
              const label = t(mode === 'single' ? 'list_select_single' : 'list_select_range')
              return (
                <Pressable
                  key={mode}
                  onPress={() => { onSwitchMode(mode) }}
                  android_ripple={{ color: rippleColor }}
                  style={{
                    ...styles.segmentBtn,
                    backgroundColor: active ? theme['m3-secondary-container'] : 'transparent',
                  }}
                >
                  <Text
                    size={12}
                    style={active ? styles.activeText : styles.inactiveText}
                    color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <View style={styles.actions}>
          {onPlayLater
            ? (
                <View style={styles.iconActionWrap}>
                  <Pressable onPress={onPlayLater} android_ripple={{ color: rippleColor }} style={styles.iconActionBtn}>
                    <Icon name="play-outline" size={14} color={theme['m3-on-surface']} />
                  </Pressable>
                </View>
              )
            : null}
          {onAdd
            ? (
                <View style={styles.iconActionWrap}>
                  <Pressable onPress={onAdd} android_ripple={{ color: rippleColor }} style={styles.iconActionBtn}>
                    <Icon name="add-music" size={14} color={theme['m3-on-surface']} />
                  </Pressable>
                </View>
              )
            : null}
          {onRemove
            ? (
                <View style={styles.iconActionWrap}>
                  <Pressable onPress={onRemove} android_ripple={{ color: rippleColor }} style={styles.iconActionBtn}>
                    <Icon name="remove" size={13} color={theme['m3-error']} />
                  </Pressable>
                </View>
              )
            : null}
          <View style={styles.actionBtnWrap}>
            <Pressable
              onPress={handleSelectAll}
              android_ripple={{ color: rippleColor }}
              style={styles.actionBtn}
            >
              <Text size={12.5} style={styles.activeText} color={theme['m3-primary']}>
                {t(isSelectAll ? 'list_select_unall' : 'list_select_all')}
              </Text>
            </Pressable>
          </View>
          <View style={styles.actionBtnWrap}>
            <Pressable
              onPress={onExitSelectMode}
              android_ripple={{ color: rippleColor }}
              style={styles.actionBtn}
            >
              <Text size={12.5} style={styles.inactiveText} color={theme['m3-on-surface-variant']}>
                {t('list_select_cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  )
})

const styles = createStyle({
  overlayWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 5,
    paddingRight: 6,
    borderRadius: M3Radius.full,
    borderWidth: 0.8,
    elevation: 4,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  segmentedGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: M3Radius.full,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: M3Radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconActionWrap: {
    borderRadius: M3Radius.full,
    overflow: 'hidden',
  },
  iconActionBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnWrap: {
    borderRadius: M3Radius.full,
    overflow: 'hidden',
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeText: {
    fontWeight: '600',
  },
  inactiveText: {
    fontWeight: '500',
  },
})
