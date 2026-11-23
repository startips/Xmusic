import { View } from 'react-native'
import Aside from './Aside'
import PlayerBar from '@/components/player/PlayerBar'
import Header from './Header'
import Main from './Main'
import { createStyle } from '@/utils/tools'
import { useSafeAreaInsets } from '@/store/common/hook'

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
})

export default () => {
  const safeInsets = useSafeAreaInsets()
  return (
    <View style={styles.container}>
      <Aside />
      <View style={{ ...styles.content, paddingRight: safeInsets.right }}>
        <Header />
        <Main />
        <PlayerBar isHome />
      </View>
    </View>
  )
}
