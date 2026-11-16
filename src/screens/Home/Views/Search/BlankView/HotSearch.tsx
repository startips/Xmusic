import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { type Source, type InitState } from '@/store/hotSearch/state'
import Button from '@/components/common/Button'
import { getList } from '@/core/hotSearch'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { M3Radius } from '@/theme/m3'


interface ListProps {
  onSearch: (keyword: string) => void
}
export interface HotSearchType {
  show: (source: Source) => void
}


export type List = NonNullable<InitState['sourceList'][keyof InitState['sourceList']]>

const ListItem = ({ keyword, onSearch }: {
  keyword: string
  onSearch: (keyword: string) => void
}) => {
  const theme = useTheme()
  return (
    <Button
      style={{
        ...styles.button,
        backgroundColor: theme['m3-surface-container'],
        borderColor: theme['m3-outline-variant'],
      }}
      onPress={() => { onSearch(keyword) }}
    >
      <Text color={theme['m3-on-surface']} size={13}>{keyword}</Text>
    </Button>
  )
}

export default forwardRef<HotSearchType, ListProps>((props, ref) => {
  // const [listType, setListType] = useState<SearchState['searchType']>('music')
  // const listRef = useRef<MusicListType>(null)
  const [list, setList] = useState<List>([])
  const t = useI18n()
  // const theme = useTheme()

  const isUnmountedRef = useRef(false)
  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  useImperativeHandle(ref, () => ({
    show(source) {
      void getList(source).then((list) => {
        if (isUnmountedRef.current) return
        setList(list)
      })
    },
  }), [])

  return (
    list.length
      ? (
          <ScrollView>
            <Text style={styles.title} size={16}>{t('search_hot_search')}</Text>
            <View style={styles.list}>
              {
                list.map(keyword => <ListItem keyword={keyword} key={keyword} onSearch={props.onSearch} />)
              }
            </View>
          </ScrollView>
        )
      : null
  )
})


const styles = createStyle({
  title: {
    // paddingLeft: 15,
    paddingTop: 15,
    // paddingBottom: 10,
  },
  list: {
    // paddingLeft: 15,
    // paddingRight: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    // paddingBottom: 15,
  },
  button: {
    textAlign: 'center',
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: M3Radius.full,
    borderWidth: 0.6,
    marginRight: 8,
    marginTop: 8,
  },
})
