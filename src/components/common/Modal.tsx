import { useImperativeHandle, forwardRef, useState, useMemo, useRef } from 'react'
import { Modal, Platform, TouchableWithoutFeedback, UIManager, View, type ViewProps, type ModalProps as _ModalProps, requireNativeComponent } from 'react-native'
import { useStatusbarHeight } from '@/store/common/hook'

const EDGE_MODAL_VIEW = 'XmusicEdgeToEdgeModalView'
const NativeEdgeToEdgeModalView = Platform.OS === 'android' && UIManager.getViewManagerConfig(EDGE_MODAL_VIEW) != null
  ? requireNativeComponent<ViewProps>(EDGE_MODAL_VIEW)
  : null

export interface ModalProps extends Omit<_ModalProps, 'visible'> {
  onHide?: () => void
  /**
   * 按返回键是否隐藏
   */
  keyHide?: boolean
  /**
   * 点击背景是否隐藏
   */
  bgHide?: boolean
  /**
   * 背景颜色
   */
  bgColor?: string
  /**
   * 是否填充状态栏
   */
  statusBarPadding?: boolean
}

export interface ModalType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<ModalType, ModalProps>(({
  onHide = () => {},
  keyHide = true,
  bgHide = true,
  bgColor = 'rgba(0,0,0,0)',
  statusBarPadding = true,
  children,
  ...props
}: ModalProps, ref) => {
  const [visible, setVisible] = useState(false)
  const visibleRef = useRef(false)
  const statusBarHeight = useStatusbarHeight()

  const closeModal = () => {
    if (!visibleRef.current) return
    visibleRef.current = false
    setVisible(false)
    onHide()
  }

  const handleRequestClose = () => {
    if (keyHide) closeModal()
  }
  const handleBgClose = () => {
    if (bgHide) closeModal()
  }

  useImperativeHandle(ref, () => ({
    setVisible(_visible) {
      if (visibleRef.current == _visible) return
      visibleRef.current = _visible
      setVisible(_visible)
      if (!_visible) onHide()
    },
  }))

  const memoChildren = useMemo(() => children, [children])

  return (
    <Modal
      animationType="fade"
      transparent={true}
      hardwareAccelerated={true}
      statusBarTranslucent={true}
      visible={visible}
      onRequestClose={handleRequestClose}
      {...props}
    >
      <TouchableWithoutFeedback onPress={handleBgClose}>
        <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: statusBarPadding ? statusBarHeight : 0 }}>
          {NativeEdgeToEdgeModalView ? <NativeEdgeToEdgeModalView pointerEvents="none" style={{ position: 'absolute', width: 0, height: 0 }} /> : null}
          {memoChildren}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
})
