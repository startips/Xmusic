import { Animated } from 'react-native'
import commonState, { type InitState as CommonState } from '@/store/common/state'

export const HOME_NAV_IDS = [
  'nav_search',
  'nav_songlist',
  'nav_top',
  'nav_love',
] as const

export const HOME_NAV_INDEX_MAP: Record<CommonState['navActiveId'], number> = {
  nav_search: 0,
  nav_songlist: 1,
  nav_top: 2,
  nav_love: 3,
}

const initialIndex = HOME_NAV_INDEX_MAP[commonState.navActiveId] ?? 0

export const homePillProgress = new Animated.Value(initialIndex)
export const homeSwipeProgress = new Animated.Value(initialIndex)

export const animateHomePillToIndex = (targetIndex: number) => {
  homeSwipeProgress.setValue(targetIndex)
  Animated.spring(homePillProgress, {
    toValue: targetIndex,
    damping: 19,
    stiffness: 290,
    mass: 0.76,
    useNativeDriver: true,
  }).start()
}

export const syncHomePagerGestureProgress = (progress: number) => {
  homePillProgress.setValue(progress)
  homeSwipeProgress.setValue(progress)
}

export const stopHomePillAnimation = () => {
  homePillProgress.stopAnimation()
}
