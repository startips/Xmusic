import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'

// import { useGetter, useDispatch } from '@/store'
// import Tag from './Tag'
// import OpenList from './OpenList'
import { createStyle } from '@/utils/tools'
// import { BorderWidths } from '@/theme'
import SourceSelector, {
  type SourceSelectorType,
} from './SourceSelector'
// import { BorderWidths } from '@/theme'
import ActiveListName, { type ActiveListNameType } from './ActiveListName'

export interface HeaderBarProps {
  onShowBound: () => void
  onSourceChange: (source: LX.OnlineSource) => void
}

export interface HeaderBarType {
  setBound: (source: LX.OnlineSource, id: string, name: string) => void
}


export default forwardRef<HeaderBarType, HeaderBarProps>(({ onShowBound, onSourceChange }, ref) => {
  const activeListNameRef = useRef<ActiveListNameType>(null)
  const sourceSelectorRef = useRef<SourceSelectorType>(null)

  useImperativeHandle(ref, () => ({
    setBound(source, id, name) {
      sourceSelectorRef.current?.setSource(source)
      activeListNameRef.current?.setBound(id, name)
    },
  }), [])


  return (
    <View style={styles.currentList}>
      <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
      <ActiveListName ref={activeListNameRef} onShowBound={onShowBound} />
    </View>
  )
})

const styles = createStyle({
  currentList: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
    height: 44,
    zIndex: 2,
    gap: 8,
  },
  selector: {
    width: 86,
  },
})
