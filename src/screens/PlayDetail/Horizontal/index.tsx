import { memo, useCallback, useEffect, useRef } from 'react'
import { View, AppState } from 'react-native'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import MoreBtn from './MoreBtn'

import Header from './components/Header'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import commonState, { type InitState as CommonState } from '@/store/common/state'

import Pic from './Pic'
import Lyric from './Lyric'
import LyricShareModal, { type LyricShareModalType } from '../components/LyricShareModal'
import Player from './Player'
import { createStyle } from '@/utils/tools'
import { useNavigationBarHeight, useSafeAreaInsets } from '@/store/common/hook'
import { useSettingValue } from '@/store/setting/hook'
import AudioSpectrum from '@/components/common/AudioSpectrum'
// import MoreBtn from './MoreBtn2'

export default memo(({ componentId, onBack }: { componentId: string, onBack: () => void }) => {
  const safeInsets = useSafeAreaInsets()
  const navBarHeight = useNavigationBarHeight()
  const visualizerMode = useSettingValue('playDetail.visualizerMode')
  const lyricShareRef = useRef<LyricShareModalType>(null)

  const paddingTop = Math.max(8, safeInsets.top + 4)
  const paddingLeft = Math.max(14, safeInsets.left + 12)
  const paddingRight = Math.max(12, safeInsets.right + 12)
  const bottomPad = Math.max(14, Math.max(navBarHeight, safeInsets.bottom) + 8)

  const handleLongPressLyric = useCallback((lineIndex: number) => {
    lyricShareRef.current?.show(lineIndex)
  }, [])

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
    screenkeepAwake()
    let appstateListener = AppState.addEventListener('change', (state) => {
      switch (state) {
        case 'active':
          if (!commonState.componentIds.comment) screenkeepAwake()
          break
        case 'background':
          screenUnkeepAwake()
          break
      }
    })

    const handleComponentIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState == 'active') screenkeepAwake()
    }

    global.state_event.on('componentIdsUpdated', handleComponentIdsChange)

    return () => {
      global.state_event.off('componentIdsUpdated', handleComponentIdsChange)
      appstateListener.remove()
      screenUnkeepAwake()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View
      style={{
        ...styles.container,
        paddingTop,
        paddingLeft,
        paddingRight,
      }}
    >
      <View style={{ ...styles.left, paddingBottom: bottomPad }}>
        <Header onBack={onBack} />
        <View style={styles.leftContent}>
          <MoreBtn />
          <Pic componentId={componentId} />
        </View>
        {visualizerMode === 'bars' || visualizerMode === 'ribbon'
          ? <AudioSpectrum mode={visualizerMode} intensity={0.85} style={styles.spectrumBar} />
          : null}
        <Player />
      </View>
      <View style={{ ...styles.right, paddingBottom: bottomPad }}>
        <Lyric onLongPressLyric={handleLongPressLyric} />
      </View>
      <LyricShareModal ref={lyricShareRef} position="right" />
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    flex: 1,
    width: '45%',
    paddingBottom: 18,
  },
  leftContent: {
    flexShrink: 1,
    flexGrow: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  spectrumBar: {
    width: '100%',
    height: 32,
    marginBottom: 4,
  },
  right: {
    width: '55%',
    flexGrow: 0,
    flexShrink: 0,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
})
