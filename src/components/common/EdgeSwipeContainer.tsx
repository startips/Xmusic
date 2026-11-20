import { type Component, forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react'
import { findNodeHandle, Platform, UIManager, View, type NativeMethods, type ViewProps, requireNativeComponent } from 'react-native'

export interface EdgeSwipeContainerProps extends ViewProps {
  edgeWidth?: number
  dismissDistance?: number
  onEdgeDismiss?: () => void
  children?: ReactNode
}

export interface EdgeSwipeContainerRef {
  prepareMinimize: () => void
}

const COMPONENT_NAME = 'XmusicEdgeSwipeView'

const NativeEdgeSwipeView = Platform.OS === 'android' && UIManager.getViewManagerConfig(COMPONENT_NAME) != null
  ? requireNativeComponent<EdgeSwipeContainerProps>(COMPONENT_NAME)
  : null

/**
 * Native-backed edge swipe dismiss wrapper that cleanly arbitrates touches
 * ahead of inner ViewPager/FlatList views without blocking normal taps or center swipes.
 */
export default forwardRef<EdgeSwipeContainerRef, EdgeSwipeContainerProps>(({
  edgeWidth = 42,
  dismissDistance = 64,
  onEdgeDismiss,
  children,
  ...props
}, ref) => {
  const nativeRef = useRef<(Component<EdgeSwipeContainerProps> & Readonly<NativeMethods>) | null>(null)

  useImperativeHandle(ref, () => ({
    prepareMinimize: () => {
      const node = findNodeHandle(nativeRef.current)
      if (node == null) return
      const config = UIManager.getViewManagerConfig(COMPONENT_NAME)
      const cmdId = config?.Commands?.prepareMinimize
      if (cmdId != null) {
        UIManager.dispatchViewManagerCommand(node, cmdId, [])
      }
    },
  }), [])

  if (!NativeEdgeSwipeView) {
    return <View {...props}>{children}</View>
  }
  return (
    <NativeEdgeSwipeView
      ref={nativeRef}
      edgeWidth={edgeWidth}
      dismissDistance={dismissDistance}
      onEdgeDismiss={onEdgeDismiss}
      {...props}
    >
      {children}
    </NativeEdgeSwipeView>
  )
})
