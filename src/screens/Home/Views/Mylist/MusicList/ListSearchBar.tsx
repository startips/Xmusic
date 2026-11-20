import { useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Animated, View, Pressable } from 'react-native'

import Text from '@/components/common/Text'
import Input, { type InputType } from '@/components/common/Input'

import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { M3Motion, M3Radius, withAlpha } from '@/theme/m3'

interface SearchInputProps {
  onSearch: (keywork: string) => void
}
type SearchInputType = InputType

const SearchInput = forwardRef<SearchInputType, SearchInputProps>(({ onSearch }, ref) => {
  const t = useI18n()
  const [text, setText] = useState('')

  const handleChangeText = (text: string) => {
    setText(text)
    onSearch(text.trim())
  }

  return (
    <Input
      onChangeText={handleChangeText}
      placeholder={t('search_input_placeholder')}
      value={text}
      style={styles.input}
      clearBtn
      ref={ref}
    />
  )
})


export interface ListSearchBarProps {
  onSearch: (keywork: string) => void
  onExitSearch: () => void
}
export interface ListSearchBarType {
  show: () => void
  hide: () => void
}

export default forwardRef<ListSearchBarType, ListSearchBarProps>(({ onSearch, onExitSearch }, ref) => {
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const [animatePlayed, setAnimatPlayed] = useState(true)
  const animFade = useRef(new Animated.Value(0)).current
  const animTranslateY = useRef(new Animated.Value(0)).current
  const searchInputRef = useRef<SearchInputType>(null)

  const theme = useTheme()

  const handleShow = useCallback(() => {
    setVisible(true)
    setAnimatPlayed(false)
    requestAnimationFrame(() => {
      animTranslateY.setValue(-18)

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
      ]).start(() => {
        setAnimatPlayed(true)
      })
    })
  }, [animFade, animTranslateY])

  const handleHide = useCallback(() => {
    setAnimatPlayed(false)
    Animated.parallel([
      Animated.timing(animFade, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(animTranslateY, {
        toValue: -18,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(finished => {
      if (!finished) return
      setVisible(false)
      setAnimatPlayed(true)
    })
  }, [animFade, animTranslateY])

  useImperativeHandle(ref, () => ({
    show() {
      handleShow()
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    },
    hide() {
      handleHide()
    },
  }))

  const animaStyle = useMemo(() => ({
    ...styles.container,
    backgroundColor: theme['m3-surface-container-high'],
    borderColor: theme['m3-outline-variant'],
    opacity: animFade,
    transform: [
      { translateY: animTranslateY },
    ],
  }), [animFade, animTranslateY, theme])

  const rippleColor = useMemo(() => withAlpha(theme['m3-primary'], 0.14), [theme])

  const component = useMemo(() => {
    return (
      <View style={styles.overlayWrap} pointerEvents="box-none">
        <Animated.View style={animaStyle}>
          <View style={styles.content}>
            <SearchInput ref={searchInputRef} onSearch={onSearch} />
          </View>
          <View style={styles.btnWrap}>
            <Pressable
              onPress={onExitSearch}
              android_ripple={{ color: rippleColor }}
              style={styles.btn}
            >
              <Text size={13} style={styles.btnText} color={theme['m3-on-surface-variant']}>{t('list_select_cancel')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    )
  }, [animaStyle, onSearch, onExitSearch, rippleColor, theme, t])

  return !visible && animatePlayed ? null : component
})

const styles = createStyle({
  overlayWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  container: {
    marginHorizontal: 14,
    marginTop: 4,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: M3Radius.full,
    borderWidth: 0.8,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  input: {
    height: '100%',
  },
  btnWrap: {
    borderRadius: M3Radius.full,
    overflow: 'hidden',
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: '500',
  },
})
