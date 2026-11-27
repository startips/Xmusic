import { memo, useMemo, useRef } from 'react'
import { ActivityIndicator, View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { usePlayMusicInfo, usePlayQualityInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { deriveQualityBadge } from '@/utils/quality'
import { scaleSizeW } from '@/utils/pixelRatio'
import { createStyle } from '@/utils/tools'
import { withAlpha } from '@/theme/m3'
import ActionPillButton from './ActionPillButton'
import QualityPopup, { type QualityPopupType } from './QualityPopup'

export interface QualityBtnProps {
  variant?: 'vertical' | 'horizontal'
}

export default memo(({ variant = 'vertical' }: QualityBtnProps) => {
  const popupRef = useRef<QualityPopupType>(null)
  const theme = useTheme()
  const preferredQuality = useSettingValue('player.playQuality')
  const playMusicInfo = usePlayMusicInfo()
  const playQualityInfo = usePlayQualityInfo()

  const badge = useMemo(
    () => deriveQualityBadge(playQualityInfo, preferredQuality, playMusicInfo.musicInfo),
    [playQualityInfo, preferredQuality, playMusicInfo.musicInfo],
  )

  const isHorizontal = variant === 'horizontal'
  const buttonSize = isHorizontal ? 34 : scaleSizeW(48)
  const textColor = badge.isHighTier ? theme['m3-primary'] : theme['m3-on-surface']
  const frameBorderColor = badge.isHighTier
    ? withAlpha(theme['m3-primary'], 0.55)
    : withAlpha(theme['m3-on-surface'], 0.42)

  return (
    <>
      <ActionPillButton
        size={buttonSize}
        iconSize={isHorizontal ? 17 : 22}
        active={badge.isHighTier}
        inactiveBackgroundColor={
          isHorizontal
            ? withAlpha(theme['m3-surface-container-highest'], 0.72)
            : withAlpha(theme['m3-surface-container-high'], 0.72)
        }
        inactiveIconColor={theme['m3-on-surface']}
        onPress={() => {
          popupRef.current?.show()
        }}
      >
        {playQualityInfo.isSwitching
          ? <ActivityIndicator size="small" color={textColor} />
          : isHorizontal
            ? (
                <Text
                  size={badge.label.length >= 4 ? 8.5 : 10}
                  color={textColor}
                  style={styles.compactText}
                  numberOfLines={1}
                >
                  {badge.label}
                </Text>
              )
            : (
                <View style={{ ...styles.badgeFrame, borderColor: frameBorderColor }}>
                  <Text
                    size={badge.label.length >= 4 ? 9.5 : 11}
                    color={textColor}
                    style={styles.badgeText}
                    numberOfLines={1}
                  >
                    {badge.label}
                  </Text>
                </View>
              )}
      </ActionPillButton>
      <QualityPopup ref={popupRef} position={isHorizontal ? 'left' : 'bottom'} />
    </>
  )
})

const styles = createStyle({
  badgeFrame: {
    minWidth: 28,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1.35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  compactText: {
    fontWeight: '800',
    letterSpacing: -0.35,
    includeFontPadding: false,
  },
})
