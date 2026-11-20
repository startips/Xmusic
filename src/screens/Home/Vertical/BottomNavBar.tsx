import { memo, useEffect, useRef } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { BOTTOM_NAV_MENUS } from '@/config/constant'
import { setNavActiveId } from '@/core/common'
import { useI18n } from '@/lang'
import { useNavActiveId } from '@/store/common/hook'
import type { InitState } from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { M3Motion, M3Radius } from '@/theme/m3'

type BottomNavId = typeof BOTTOM_NAV_MENUS[number]['id']

const NavTab = memo(({
  id,
  icon,
  label,
  active,
  onPress,
}: {
  id: BottomNavId
  icon: string
  label: string
  active: boolean
  onPress: (id: InitState['navActiveId']) => void
}) => {
  const theme = useTheme()
  const indicatorAnim = useRef(new Animated.Value(active ? 1 : 0)).current
  const pressScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: active ? 1 : 0,
      ...M3Motion.spatialFast,
    }).start()
  }, [active, indicatorAnim])

  const pillScaleX = indicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  })

  return (
    <Pressable
      style={styles.tab}
      onPress={() => { onPress(id) }}
      onPressIn={() => { M3Motion.pressSpring(pressScale, 0.92).start() }}
      onPressOut={() => { M3Motion.pressSpring(pressScale, 1).start() }}
    >
      <Animated.View style={{ ...styles.tabInner, transform: [{ scale: pressScale }] }}>
        <View style={styles.pillWrap}>
          <Animated.View
            style={{
              ...styles.pill,
              backgroundColor: theme['m3-secondary-container'],
              opacity: indicatorAnim,
              transform: [{ scaleX: pillScaleX }],
            }}
          />
          <Icon
            name={icon}
            size={19}
            color={active ? theme['m3-on-secondary-container'] : theme['m3-on-surface-variant']}
          />
        </View>
        <Text
          size={11}
          numberOfLines={1}
          color={active ? theme['m3-on-surface'] : theme['m3-on-surface-variant']}
          style={active ? styles.labelActive : styles.label}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
})

export default memo(() => {
  const activeId = useNavActiveId()
  const theme = useTheme()
  const t = useI18n()

  if (activeId == 'nav_setting') {
    return <View style={styles.settingSpacer} />
  }

  const handlePress = (id: InitState['navActiveId']) => {
    setNavActiveId(id)
  }

  return (
    <View
      style={{
        ...styles.container,
        backgroundColor: theme['m3-surface-container-low'],
        borderTopColor: theme['m3-outline-variant'],
      }}
    >
      {BOTTOM_NAV_MENUS.map(menu => (
        <NavTab
          key={menu.id}
          id={menu.id}
          icon={menu.icon}
          label={t(menu.id)}
          active={activeId == menu.id}
          onPress={handlePress}
        />
      ))}
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillWrap: {
    width: 58,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  pill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: M3Radius.full,
  },
  label: {
    fontWeight: '400',
  },
  labelActive: {
    fontWeight: '700',
  },
  settingSpacer: {
    height: scaleSizeH(8),
  },
})
