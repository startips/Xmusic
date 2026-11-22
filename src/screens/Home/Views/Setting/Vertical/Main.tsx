import { useCallback, useRef } from 'react'
import { ScrollView, View } from 'react-native'

import NavList from './NavList'
import Main, { type MainType, type SettingScreenIds } from '../Main'
import { createStyle } from '@/utils/tools'

export default () => {
  const mainRef = useRef<MainType>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false })
    mainRef.current?.setActiveId(id)
  }, [])

  return (
    <View style={styles.container}>
      <NavList onChangeId={handleChangeId} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps={'always'}
      >
        <Main ref={mainRef} />
      </ScrollView>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
})
