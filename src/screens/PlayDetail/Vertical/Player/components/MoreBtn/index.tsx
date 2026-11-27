import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import PlayModeBtn from './PlayModeBtn'
import MusicAddBtn from './MusicAddBtn'
import QualityBtn from '../../../../components/QualityBtn'
import CommentBtn from './CommentBtn'
import QueueBtn from './QueueBtn'

export default () => {
  return (
    <View style={styles.container}>
      <QualityBtn variant="vertical" />
      <MusicAddBtn />
      <PlayModeBtn />
      <QueueBtn />
      <CommentBtn />
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 12,
  },
})
