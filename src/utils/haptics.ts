import settingState from '@/store/setting/state'
import { performHaptic } from '@/utils/nativeModules/utils'

export type HapticType = 'heart' | 'tick' | 'confirm' | 'heavy' | 'light'

export const triggerHaptic = (type: HapticType = 'light') => {
  if (!settingState.setting['common.enableHaptics']) return
  performHaptic(type)
}

export const hapticLight = () => { triggerHaptic('light') }
export const hapticTick = () => { triggerHaptic('tick') }
export const hapticHeart = () => { triggerHaptic('heart') }
export const hapticConfirm = () => { triggerHaptic('confirm') }
export const hapticHeavy = () => { triggerHaptic('heavy') }
