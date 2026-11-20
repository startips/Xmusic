import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import PlayModeBtn from './PlayModeBtn'
import MusicAddBtn from './MusicAddBtn'
import DesktopLyricBtn from './DesktopLyricBtn'
import CommentBtn from './CommentBtn'

export default () => {
  return (
    <View style={styles.container}>
      <DesktopLyricBtn />
      <MusicAddBtn />
      <PlayModeBtn />
      <CommentBtn />
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 2,
    paddingBottom: 8,
  },
})
