import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { View, ScrollView } from 'react-native'

import { createStyle } from '@/utils/tools'
import TagGroup, { type TagGroupProps } from './TagGroup'
import { useI18n } from '@/lang'
import { type TagInfo, type Source } from '@/store/songlist/state'
import { getTags } from '@/core/songlist'
import Text from '@/components/common/Text'
import { useDrawerSurfaceColor, useTheme } from '@/store/theme/hook'

export interface ListProps {
  onTagChange: TagGroupProps['onTagChange']
}

export interface ListType {
  loadTag: (source: Source, activeId: string) => void
}

export default forwardRef<ListType, ListProps>(({ onTagChange }, ref) => {
  const theme = useTheme()
  const drawerBg = useDrawerSurfaceColor()
  const [activeId, setActiveId] = useState('')
  const [list, setList] = useState<TagInfo['tags']>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const t = useI18n()
  const prevSource = useRef('')

  const isUnmountedRef = useRef(false)
  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  useImperativeHandle(ref, () => ({
    loadTag(source, id) {
      if (id != activeId) setActiveId(id)
      if (source != prevSource.current) {
        setLoading(true)
        setLoadError(false)
        setList([{ name: '', list: [{ name: t('songlist_tag_default'), id: '', parent_id: '', parent_name: '', source }] }])
        void getTags(source).then(tagInfo => {
          if (isUnmountedRef.current) return
          prevSource.current = source
          setLoading(false)
          setList([
            { name: '', list: [{ name: t('songlist_tag_default'), id: '', parent_id: '', parent_name: '', source }] },
            { name: t('songlist_tag_hot'), list: [...tagInfo.hotTag] },
            ...tagInfo.tags,
          ].filter(t => t.list.length))
        }).catch(() => {
          if (isUnmountedRef.current) return
          setLoading(false)
          setLoadError(true)
        })
      }
    },
  }))


  return (
    <View style={{ flex: 1, backgroundColor: drawerBg }}>
      <View style={{ ...styles.header, borderBottomColor: theme['m3-outline-variant'] }}>
        <Text size={16} style={styles.headerTitle} color={theme['m3-on-surface']}>{t('songlist_tags')}</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.tagContainer}
        keyboardShouldPersistTaps={'always'}
      >
        <View onStartShouldSetResponder={() => true}>
          {
            list.map((type, index) => (
              <TagGroup
                key={index}
                name={type.name}
                list={type.list}
                activeId={activeId}
                onTagChange={onTagChange}
              />
            ))
          }
          {
            loading || loadError
              ? (
                  <View style={styles.blankView}>
                    <Text color={theme['m3-on-surface-variant']}>{loadError ? t('list_error') : t('list_loading')}</Text>
                  </View>
                )
              : null
          }
        </View>
      </ScrollView>
    </View>
  )
})


const styles = createStyle({
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.6,
  },
  headerTitle: {
    fontWeight: '700',
  },
  tagContainer: {
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  blankView: {
    paddingTop: '15%',
    paddingBottom: '15%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
