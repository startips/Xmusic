import { memo, useCallback, useEffect, useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'

import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import EdgeSwipeContainer from '@/components/common/EdgeSwipeContainer'
import PlayerBar from '@/components/player/PlayerBar'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import SettingViews from '@/screens/Home/Views/Setting'
import { COMPONENT_IDS } from '@/config/constant'
import { removeComponentId, setComponentId } from '@/core/common'
import { pop } from '@/navigation'
import { useI18n } from '@/lang'
import { useStatusbarHeight } from '@/store/common/hook'
import commonState from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { scaleSizeH } from '@/utils/pixelRatio'
import { createStyle } from '@/utils/tools'

const TOP_BAR_HEIGHT = scaleSizeH(50)

const Header = memo(({ onBack }: { onBack: () => void }) => {
  const t = useI18n()
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()

  return (
    <View
      style={{
        ...styles.header,
        height: TOP_BAR_HEIGHT + statusBarHeight,
        paddingTop: statusBarHeight,
      }}
    >
      <View style={styles.headerInner}>
        <TouchableOpacity
          style={{ ...styles.backBtn, backgroundColor: theme['m3-surface-container'] }}
          activeOpacity={0.7}
          onPress={onBack}
        >
          <Icon name="chevron-left" size={16} color={theme['m3-on-surface']} />
        </TouchableOpacity>
        <Text size={20} color={theme['m3-on-surface']} style={styles.title} numberOfLines={1}>
          {t('nav_setting')}
        </Text>
      </View>
    </View>
  )
})

export default memo(({ componentId }: { componentId: string }) => {
  const isDismissingRef = useRef(false)

  useEffect(() => {
    setComponentId(COMPONENT_IDS.setting, componentId)
    return () => {
      removeComponentId(componentId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBack = useCallback(() => {
    if (isDismissingRef.current) return
    isDismissingRef.current = true
    void pop(componentId)
  }, [componentId])

  useBackHandler(useCallback(() => {
    if (Boolean(commonState.componentIds.playDetail) || Boolean(commonState.componentIds.comment)) return false
    handleBack()
    return true
  }, [handleBack]))

  return (
    <EdgeSwipeContainer
      edgeWidth={24}
      dismissDistance={64}
      onEdgeDismiss={handleBack}
      style={styles.edgeWrap}
    >
      <PageContent>
        <StatusBar />
        <Header onBack={handleBack} />
        <View style={styles.body}>
          <SettingViews />
        </View>
        <PlayerBar />
      </PageContent>
    </EdgeSwipeContainer>
  )
})

const styles = createStyle({
  edgeWrap: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: M3Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  body: {
    flex: 1,
  },
})
