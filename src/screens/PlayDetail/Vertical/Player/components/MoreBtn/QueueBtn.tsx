import { memo, useRef } from 'react'
import { View } from 'react-native'
import Text from '@/components/common/Text'
import { useTempPlayList } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { M3Radius } from '@/theme/m3'
import { createStyle } from '@/utils/tools'
import QueuePopup, { type QueuePopupType } from '../../../../components/QueuePopup'
import Btn from './Btn'

export default memo(() => {
  const popupRef = useRef<QueuePopupType>(null)
  const tempList = useTempPlayList()
  const theme = useTheme()

  return (
    <View>
      <Btn
        icon="menu"
        active={tempList.length > 0}
        onPress={() => { popupRef.current?.show() }}
      />
      {tempList.length > 0
        ? (
            <View pointerEvents="none" style={{ ...styles.badge, backgroundColor: theme['m3-primary'] }}>
              <Text size={9.5} color={theme['m3-on-primary']} style={styles.badgeText}>
                {tempList.length > 99 ? '99+' : tempList.length}
              </Text>
            </View>
          )
        : null}
      <QueuePopup ref={popupRef} />
    </View>
  )
})

const styles = createStyle({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: M3Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
})
