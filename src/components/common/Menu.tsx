import { useImperativeHandle, forwardRef, useMemo, useRef, useState, type Ref } from 'react'
import { View, Animated, TouchableHighlight } from 'react-native'
import { useWindowSize } from '@/utils/hooks'
import { useNavigationBarHeight, useStatusbarHeight } from '@/store/common/hook'

import Modal, { type ModalType } from './Modal'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { M3Radius } from '@/theme/m3'

const menuItemHeight = scaleSizeH(42)
const menuItemWidth = scaleSizeW(144)
const MENU_PADDING_V = scaleSizeH(6)
const MENU_ITEM_MARGIN_H = scaleSizeW(6)

export interface Position { w: number, h: number, x: number, y: number, menuWidth?: number, menuHeight?: number }
export interface MenuSize { width?: number, height?: number }
export type Menus = Readonly<Array<{ action: string, label: string, disabled?: boolean }>>

const styles = createStyle({
  menu: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: M3Radius.md,
    overflow: 'hidden',
    elevation: 8,
  },
  menuItem: {
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: M3Radius.sm,
    justifyContent: 'center',
  },
})

interface Props<M extends Menus = Menus> {
  menus: Readonly<M>
  onPress?: (menu: M[number]) => void
  buttonPosition: Position
  menuSize: MenuSize
  onHide: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

const Menu = ({
  buttonPosition,
  menuSize,
  menus,
  width,
  height,
  onPress = () => {},
  onHide,
  activeId,
  fontSize = 15,
  center = false,
}: Props) => {
  const theme = useTheme()
  const windowSize = useWindowSize()
  const statusBarHeight = useStatusbarHeight()
  const navBarHeight = useNavigationBarHeight()

  const menuItemStyle = useMemo(() => {
    const resolvedWidth = width ?? Math.max(menuSize.width ?? 0, menuItemWidth)
    const resolvedHeight = height ?? menuSize.height ?? menuItemHeight
    return {
      width: resolvedWidth,
      height: resolvedHeight,
    }
  }, [menuSize, width, height])

  const menuStyle = useMemo(() => {
    const safeTop = statusBarHeight + 8
    const safeBottom = Math.max(16, navBarHeight + 12)
    let menuHeight = menus.length * menuItemStyle.height + MENU_PADDING_V * 2 + 2
    const topSpace = Math.max(120, buttonPosition.y - safeTop)
    const bottomSpace = Math.max(120, windowSize.height - buttonPosition.y - buttonPosition.h - safeBottom)
    if (menuHeight > topSpace && menuHeight > bottomSpace) {
      menuHeight = Math.max(topSpace, bottomSpace)
    }

    const menuWidth = menuItemStyle.width + MENU_ITEM_MARGIN_H * 2 + 2
    const showInBottom = (windowSize.height - buttonPosition.y - buttonPosition.h - safeBottom) >= menuHeight || bottomSpace >= topSpace
    const rawTop = showInBottom ? buttonPosition.y + buttonPosition.h + 4 : buttonPosition.y - menuHeight - 4
    const clampedTop = Math.max(safeTop, Math.min(rawTop, windowSize.height - menuHeight - safeBottom))

    const rightRemaining = windowSize.width - buttonPosition.x - menuWidth
    const rawLeft = rightRemaining >= 8
      ? buttonPosition.x
      : buttonPosition.x + buttonPosition.w - menuWidth
    const clampedLeft = Math.max(8, Math.min(rawLeft, windowSize.width - menuWidth - 8))

    return {
      height: menuHeight,
      width: menuWidth,
      top: clampedTop,
      left: clampedLeft,
      paddingVertical: MENU_PADDING_V,
    }
  }, [menus.length, menuItemStyle, buttonPosition, windowSize, statusBarHeight, navBarHeight])

  const menuPress = (menu: Menus[number]) => {
    onPress(menu)
    onHide()
  }

  return (
    <View
      style={{
        ...styles.menu,
        ...menuStyle,
        backgroundColor: theme['m3-surface-container-high'],
        borderColor: theme['m3-outline-variant'],
      }}
      onStartShouldSetResponder={() => true}
    >
      <Animated.ScrollView keyboardShouldPersistTaps={'always'}>
        {
          menus.map((menu) => (
            menu.disabled
              ? (
                  <View
                    key={menu.action}
                    style={{ ...styles.menuItem, marginHorizontal: MENU_ITEM_MARGIN_H, width: menuItemStyle.width, height: menuItemStyle.height, opacity: 0.38 }}
                  >
                    <Text style={{ textAlign: center ? 'center' : 'left' }} size={fontSize} color={theme['m3-on-surface']} numberOfLines={1}>{menu.label}</Text>
                  </View>
                )
              : menu.action == activeId
                ? (
                    <TouchableHighlight
                      key={menu.action}
                      style={{
                        ...styles.menuItem,
                        marginHorizontal: MENU_ITEM_MARGIN_H,
                        width: menuItemStyle.width,
                        height: menuItemStyle.height,
                        backgroundColor: theme['m3-secondary-container'],
                      }}
                      underlayColor={theme['m3-surface-container-highest']}
                      onPress={onHide}
                    >
                      <Text style={{ textAlign: center ? 'center' : 'left', fontWeight: '600' }} color={theme['m3-on-secondary-container']} size={fontSize} numberOfLines={1}>{menu.label}</Text>
                    </TouchableHighlight>
                  )
                : (
                    <TouchableHighlight
                      key={menu.action}
                      style={{ ...styles.menuItem, marginHorizontal: MENU_ITEM_MARGIN_H, width: menuItemStyle.width, height: menuItemStyle.height }}
                      underlayColor={theme['m3-surface-container-highest']}
                      onPress={() => { menuPress(menu) }}
                    >
                      <Text style={{ textAlign: center ? 'center' : 'left' }} color={theme['m3-on-surface']} size={fontSize} numberOfLines={1}>{menu.label}</Text>
                    </TouchableHighlight>
                  )

          ))
        }
      </Animated.ScrollView>
    </View>
  )
}

export interface MenuProps<M extends Menus = Menus> {
  menus: M
  onPress: (menu: M[number]) => void
  onHide?: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

export interface MenuType {
  show: (position: Position, menuSize?: MenuSize) => void
  hide: () => void
}

const Component = <M extends Menus>({ menus, width, height, activeId, onHide, onPress, fontSize, center }: MenuProps<M>, ref: Ref<MenuType>) => {
  const modalRef = useRef<ModalType>(null)
  const [position, setPosition] = useState<Position>({ w: 0, h: 0, x: 0, y: 0 })
  const [menuSize, setMenuSize] = useState<MenuSize>({})
  const hide = () => {
    modalRef.current?.setVisible(false)
  }
  useImperativeHandle(ref, () => ({
    show(newPosition, nextMenuSize) {
      setPosition(newPosition)
      if (nextMenuSize) setMenuSize(nextMenuSize)
      modalRef.current?.setVisible(true)
    },
    hide() {
      hide()
    },
  }))

  return (
    <Modal onHide={onHide} statusBarPadding={false} ref={modalRef}>
      <Menu menus={menus} width={width} height={height} activeId={activeId} buttonPosition={position} menuSize={menuSize} onPress={onPress} onHide={hide} fontSize={fontSize} center={center} />
    </Modal>
  )
}

export default forwardRef(Component) as <M extends Menus>(p: MenuProps<M> & { ref?: Ref<MenuType> }) => JSX.Element | null
