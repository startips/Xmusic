import { type NAV_ID_Type, type COMPONENT_IDS } from '@/config/constant'


export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

export interface InitState {
  fontSize: number
  statusbarHeight: number
  navigationBarHeight: number
  safeAreaInsets: SafeAreaInsets
  componentIds: Partial<Record<COMPONENT_IDS, string>>
  navActiveId: NAV_ID_Type
  lastNavActiveId: NAV_ID_Type
  sourceNames: Record<LX.OnlineSource | 'all', string>
  bgPic: string | null
}

const initData = {}

const state: InitState = {
  fontSize: global.lx.fontSize,
  statusbarHeight: 0,
  navigationBarHeight: 0,
  safeAreaInsets: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  componentIds: {},
  navActiveId: 'nav_search',
  lastNavActiveId: 'nav_search',
  sourceNames: initData as InitState['sourceNames'],
  bgPic: null,
}


export default state
