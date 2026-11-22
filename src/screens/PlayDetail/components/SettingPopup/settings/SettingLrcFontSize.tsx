import { useState } from 'react'
import { View } from 'react-native'
import { SegmentedCardItem } from '@/components/common/m3e/SegmentedCard'
import Slider, { type SliderProps } from '@/components/common/Slider'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import styles from './style'

const LrcFontSize = ({ direction }: {
  direction: 'horizontal' | 'vertical'
}) => {
  const theme = useTheme()
  const settingKey = direction == 'horizontal' ? 'playDetail.horizontal.style.lrcFontSize' : 'playDetail.vertical.style.lrcFontSize'
  const lrcFontSize = useSettingValue(settingKey)
  const [sliderSize, setSliderSize] = useState(lrcFontSize)
  const [isSliding, setSliding] = useState(false)
  const t = useI18n()

  const handleSlidingStart: SliderProps['onSlidingStart'] = () => {
    setSliding(true)
  }
  const handleValueChange: SliderProps['onValueChange'] = value => {
    setSliderSize(value)
  }
  const handleSlidingComplete: SliderProps['onSlidingComplete'] = value => {
    setSliding(false)
    if (lrcFontSize == value) return
    updateSetting({ [settingKey]: value })
  }

  return (
    <SegmentedCardItem index={2} count={4}>
      <View style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <Text size={13.5} color={theme['m3-on-surface']} style={styles.titleText} numberOfLines={1}>
            {t('play_detail_setting_lrc_font_size')}
          </Text>
          <View style={{ ...styles.valuePill, backgroundColor: theme['m3-surface-container-high'] }}>
            <Text size={12} color={theme['m3-primary']} style={styles.valueText}>
              {Math.round((isSliding ? sliderSize : lrcFontSize) / 10)}
            </Text>
          </View>
        </View>
        <View style={styles.sliderBleed}>
          <Slider
            minimumValue={100}
            maximumValue={300}
            onSlidingComplete={handleSlidingComplete}
            onValueChange={handleValueChange}
            onSlidingStart={handleSlidingStart}
            step={2}
            value={lrcFontSize}
          />
        </View>
      </View>
    </SegmentedCardItem>
  )
}

export default LrcFontSize
