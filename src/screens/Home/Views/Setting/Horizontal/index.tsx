import { useCallback, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import NavList from './NavList'
import Main, { type MainType, type SettingScreenIds } from '../Main'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: BorderWidths.normal,
  },
  nav: {
    height: '100%',
    width: '24%',
    maxWidth: 220,
    minWidth: 140,
    borderRightWidth: BorderWidths.normal,
  },
  scroll: {
    flex: 1,
  },
  main: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
  },
})

export default () => {
  const theme = useTheme()
  const mainRef = useRef<MainType>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false })
    mainRef.current?.setActiveId(id)
  }, [])

  return (
    <View style={{ ...styles.container, borderTopColor: theme['m3-outline-variant'] }}>
      <View style={{ ...styles.nav, borderRightColor: theme['m3-outline-variant'] }}>
        <NavList onChangeId={handleChangeId} />
      </View>
      <ScrollView ref={scrollViewRef} style={styles.scroll} keyboardShouldPersistTaps={'always'}>
        <View style={styles.main}>
          <Main ref={mainRef} />
        </View>
      </ScrollView>
    </View>
  )
}
