import { useState } from 'react'
import { View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { ExpressiveButton } from '@/components/common/m3e/ExpressiveButton'
import { SegmentedCardItem } from '@/components/common/m3e/SegmentedCard'
import Slider, { type SliderProps } from '@/components/common/Slider'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'
import { setPlaybackRate as setLyricPlaybackRate } from '@/core/lyric'
import { useI18n } from '@/lang'
import { setPlaybackRate, updateMetaData } from '@/plugins/player'
import playerState from '@/store/player/state'
import { useSettingValue } from '@/store/setting/hook'
import settingState from '@/store/setting/state'
import { useTheme } from '@/store/theme/hook'
import styles from './style'

const MIN_VALUE = 60
const MAX_VALUE = 200

export default () => {
  const theme = useTheme()
  const playbackRate = Math.trunc(useSettingValue('player.playbackRate') * 100)
  const [sliderSize, setSliderSize] = useState(playbackRate)
  const [isSliding, setSliding] = useState(false)
  const t = useI18n()

  const handleSlidingStart: SliderProps['onSlidingStart'] = () => {
    setSliding(true)
  }
  const handleValueChange: SliderProps['onValueChange'] = value => {
    value = Math.trunc(value)
    setSliderSize(value)
    void setPlaybackRate(parseFloat((value / 100).toFixed(2)))
  }
  const handleSlidingComplete: SliderProps['onSlidingComplete'] = value => {
    setSliding(false)
    value = Math.trunc(value)
    const rate = value / 100
    void setLyricPlaybackRate(rate)
    void updateMetaData(playerState.musicInfo, playerState.isPlay, true)
    if (playbackRate == value) return
    updateSetting({ 'player.playbackRate': rate })
  }
  const handleReset = () => {
    if (settingState.setting['player.playbackRate'] == 1) return
    setSliderSize(100)
    void setPlaybackRate(1).then(() => {
      void updateMetaData(playerState.musicInfo, playerState.isPlay, true)
      void setLyricPlaybackRate(1)
    })
    updateSetting({ 'player.playbackRate': 1 })
  }

  const shownRate = isSliding ? sliderSize : playbackRate
  const isDefaultRate = playbackRate === 100 && (!isSliding || sliderSize === 100)

  return (
    <SegmentedCardItem index={0} count={2}>
      <View style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <View style={styles.sliderHeaderLeft}>
            <Icon name="playback-rate" size={14} color={theme['m3-on-surface-variant']} />
            <Text size={13.5} color={theme['m3-on-surface']} style={styles.titleText} numberOfLines={1}>
              {t('play_detail_setting_playback_rate')}
            </Text>
          </View>
          <View style={styles.sliderHeaderRight}>
            <View style={{ ...styles.valuePill, backgroundColor: theme['m3-surface-container-high'] }}>
              <Text size={12} color={theme['m3-primary']} style={styles.valueText}>
                {`${(shownRate / 100).toFixed(2)}x`}
              </Text>
            </View>
            <ExpressiveButton
              size="sm"
              variant={isDefaultRate ? 'surface' : 'secondary'}
              disabled={isDefaultRate}
              onPress={handleReset}
              textSize={11.5}
              style={{ minHeight: 26, paddingHorizontal: 10, paddingVertical: 3 }}
            >
              {t('play_detail_setting_playback_rate_reset')}
            </ExpressiveButton>
          </View>
        </View>
        <View style={styles.sliderBleed}>
          <Slider
            minimumValue={MIN_VALUE}
            maximumValue={MAX_VALUE}
            onSlidingComplete={handleSlidingComplete}
            onValueChange={handleValueChange}
            onSlidingStart={handleSlidingStart}
            step={1}
            value={playbackRate}
          />
        </View>
      </View>
    </SegmentedCardItem>
  )
}
