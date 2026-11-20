import { type ReactNode } from 'react'
import { Platform, UIManager, View, type ViewProps, requireNativeComponent } from 'react-native'

export interface AlphaFadeViewProps extends ViewProps {
  topFadeStart?: number
  topFadeEnd?: number
  fadeStart?: number
  fadeEnd?: number
  children?: ReactNode
}

const COMPONENT_NAME = 'XmusicAlphaFadeView'

const NativeAlphaFadeView = Platform.OS === 'android' && UIManager.getViewManagerConfig(COMPONENT_NAME) != null
  ? requireNativeComponent<AlphaFadeViewProps>(COMPONENT_NAME)
  : null

/**
 * Container that smoothly fades its children's top and bottom edges to transparent.
 */
export default ({
  topFadeStart = 0,
  topFadeEnd = 0,
  fadeStart = 0.56,
  fadeEnd = 1,
  children,
  ...props
}: AlphaFadeViewProps) => {
  if (!NativeAlphaFadeView) {
    return <View {...props}>{children}</View>
  }
  return (
    <NativeAlphaFadeView
      topFadeStart={topFadeStart}
      topFadeEnd={topFadeEnd}
      fadeStart={fadeStart}
      fadeEnd={fadeEnd}
      {...props}
    >
      {children}
    </NativeAlphaFadeView>
  )
}
