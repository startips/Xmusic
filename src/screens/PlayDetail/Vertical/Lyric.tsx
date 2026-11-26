import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useStatusbarHeight } from '@/store/common/hook'
import { useWindowSize } from '@/utils/hooks'
import { HEADER_HEIGHT, getVerticalHeaderTopExtra } from './components/Header'
import LyricList from '../components/LyricList'

export default ({ onLongPressLyric }: { onLongPressLyric?: (lineIndex: number) => void }) => {
  const statusBarHeight = useStatusbarHeight()
  const winSize = useWindowSize()

  return (
    <View style={[styles.wrapper, { paddingTop: statusBarHeight + getVerticalHeaderTopExtra(winSize.height) + HEADER_HEIGHT }]}>
      <View style={styles.lyricBody}>
        <LyricList
          fontSizeSettingKey="playDetail.vertical.style.lrcFontSize"
          activeViewPosition={0.46}
          onLongPressLyric={onLongPressLyric}
        />
      </View>
    </View>
  )
}

const styles = createStyle({
  wrapper: {
    flex: 1,
  },
  lyricBody: {
    flex: 1,
  },
})
