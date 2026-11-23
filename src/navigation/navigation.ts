import { Navigation } from 'react-native-navigation'
// import { InteractionManager } from 'react-native'

import {
  HOME_SCREEN,
  PLAY_DETAIL_SCREEN,
  SONGLIST_DETAIL_SCREEN,
  COMMENT_SCREEN,
  SETTING_SCREEN,
} from './screenNames'

import themeState from '@/store/theme/state'
import commonState from '@/store/common/state'
import { COMPONENT_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { getStatusBarStyle } from './utils'
import { windowSizeTools } from '@/utils/windowSizeTools'
import { isHorizontalMode } from '@/utils/tools'
import { toOpaqueColor } from '@/theme/m3'
import { type ListInfoItem } from '@/store/songlist/state'
import { getPlayerBarPicRect, preparePlayDetailMinimize } from './playerBarTarget'

const getScreenSurfaceBackground = (theme: LX.ActiveTheme) => {
  return toOpaqueColor(theme['c-main-background'] || theme['c-content-background'])
}

const navPushLocks: Record<string, number> = {}
const acquireNavPushLock = (key: string, lockMs = 420): boolean => {
  const now = Date.now()
  if (navPushLocks[key] != null && now - navPushLocks[key] < lockMs) return false
  navPushLocks[key] = now
  return true
}

/**
 * Sync Android system status/navigation bar appearance with the active theme and screen layout.
 */
export function syncScreenNavigationTheme(theme: LX.ActiveTheme = themeState.theme) {
  const statusBarStyle = getStatusBarStyle(theme.isDark)
  const surfaceBg = getScreenSurfaceBackground(theme)

  if (commonState.componentIds[COMPONENT_IDS.home]) {
    Navigation.mergeOptions(commonState.componentIds[COMPONENT_IDS.home], {
      statusBar: { style: statusBarStyle },
      navigationBar: {
        backgroundColor: 'transparent',
      },
      layout: {
        componentBackgroundColor: surfaceBg,
      },
    })
  }

  for (const idKey of [COMPONENT_IDS.playDetail, COMPONENT_IDS.songlistDetail, COMPONENT_IDS.comment, COMPONENT_IDS.setting]) {
    const compId = commonState.componentIds[idKey]
    if (!compId) continue
    Navigation.mergeOptions(compId, {
      statusBar: { style: statusBarStyle },
      navigationBar: {
        backgroundColor: 'transparent',
      },
      layout: {
        componentBackgroundColor: surfaceBg,
      },
    })
  }
}

// const store = getStore()
// const getTheme = () => getter('common', 'theme')(store.getState())

export async function pushHomeScreen() {
  /*
    Navigation.setDefaultOptions({
      topBar: {
        background: {
          color: '#039893',
        },
        title: {
          color: 'white',
        },
        backButton: {
          title: '', // Remove previous screen name from back button
          color: 'white',
        },
        buttonColor: 'white',
      },
      statusBar: {
        style: 'light',
      },
      layout: {
        orientation: ['portrait'],
      },
      bottomTabs: {
        titleDisplayMode: 'alwaysShow',
      },
      bottomTab: {
        textColor: 'gray',
        selectedTextColor: 'black',
        iconColor: 'gray',
        selectedIconColor: 'black',
      },
    })
  */

  const theme = themeState.theme
  const surfaceBg = getScreenSurfaceBackground(theme)

  return Navigation.setRoot({
    root: {
      stack: {
        children: [{
          component: {
            name: HOME_SCREEN,
            options: {
              topBar: {
                visible: false,
                height: 0,
                drawBehind: false,
              },
              statusBar: {
                drawBehind: true,
                visible: true,
                style: getStatusBarStyle(theme.isDark),
                backgroundColor: 'transparent',
              },
              navigationBar: {
                // visible: false,
                backgroundColor: 'transparent',
              },
              layout: {
                componentBackgroundColor: surfaceBg,
              },
            },
          },
        }],
      },
    },
  })
}
const buildPlayDetailPopAnimation = (winWidth: number, winHeight: number) => {
  const safeW = Math.max(winWidth, 320)
  const safeH = Math.max(winHeight, 320)
  const horizontal = isHorizontalMode(safeW, safeH)
  const measured = getPlayerBarPicRect(safeW, safeH)
  const rect = measured && measured.width > 0 && measured.height > 0 && measured.y < safeH
    ? measured
    : {
        x: horizontal ? 84 : 18,
        y: safeH - (horizontal ? 76 : 126),
        width: 44,
        height: 44,
      }

  const targetCX = rect.x + rect.width / 2
  const targetCY = rect.y + rect.height / 2
  const tx = Math.round(targetCX - safeW / 2)
  const ty = Math.round(targetCY - safeH / 2)
  const targetScaleX = Math.max(0.05, Math.min(0.2, Number((rect.width / safeW).toFixed(3))))
  const targetScaleY = Math.max(0.05, Math.min(0.2, Number((rect.height / safeH).toFixed(3))))

  return {
    content: {
      scaleX: {
        from: 1,
        to: targetScaleX,
        duration: 460,
        interpolation: { type: 'fastOutSlowIn' as const },
      },
      scaleY: {
        from: 1,
        to: targetScaleY,
        duration: 460,
        interpolation: { type: 'fastOutSlowIn' as const },
      },
      translationX: {
        from: 0,
        to: tx,
        duration: 430,
        interpolation: { type: 'decelerate' as const, factor: 1.35 },
      },
      translationY: {
        from: 0,
        to: ty,
        duration: 460,
        interpolation: { type: 'accelerate' as const, factor: 1.15 },
      },
      alpha: {
        from: 1,
        to: 0,
        startDelay: 320,
        duration: 140,
        interpolation: { type: 'accelerate' as const },
      },
    },
  }
}

export function popPlayDetailScreen(componentId: string) {
  preparePlayDetailMinimize()
  const { width, height } = windowSizeTools.getSize()
  void Navigation.pop(componentId, {
    animations: {
      pop: buildPlayDetailPopAnimation(width, height),
    },
  })
}

export function pushPlayDetailScreen(componentId: string, skipAnimation = false) {
  if (Boolean(commonState.componentIds.playDetail) || !acquireNavPushLock('playDetail')) return
  /*
    Navigation.setDefaultOptions({
      topBar: {
        background: {
          color: '#039893',
        },
        title: {
          color: 'white',
        },
        backButton: {
          title: '', // Remove previous screen name from back button
          color: 'white',
        },
        buttonColor: 'white',
      },
      statusBar: {
        style: 'light',
      },
      layout: {
        orientation: ['portrait'],
      },
      bottomTabs: {
        titleDisplayMode: 'alwaysShow',
      },
      bottomTab: {
        textColor: 'gray',
        selectedTextColor: 'black',
        iconColor: 'gray',
        selectedIconColor: 'black',
      },
    })
  */
  requestAnimationFrame(() => {
    const theme = themeState.theme
    const { width: winWidth, height: winHeight } = windowSizeTools.getSize()

    void Navigation.push(componentId, {
      component: {
        name: PLAY_DETAIL_SCREEN,
        options: {
          topBar: {
            visible: false,
            height: 0,
            drawBehind: false,
          },
          statusBar: {
            drawBehind: true,
            visible: true,
            style: getStatusBarStyle(theme.isDark),
            backgroundColor: 'transparent',
          },
          navigationBar: {
            // visible: false,
            backgroundColor: 'transparent',
          },
          layout: {
            componentBackgroundColor: getScreenSurfaceBackground(theme),
          },
          animations: {
            push: skipAnimation ? {} : {
              waitForRender: true,
              sharedElementTransitions: [
                {
                  fromId: NAV_SHEAR_NATIVE_IDS.playDetail_pic,
                  toId: NAV_SHEAR_NATIVE_IDS.playDetail_pic,
                  duration: 280,
                  interpolation: { type: 'fastOutSlowIn' as const },
                },
              ],
              elementTransitions: [
                {
                  id: NAV_SHEAR_NATIVE_IDS.playDetail_header,
                  alpha: {
                    from: 0,
                    duration: 260,
                    interpolation: { type: 'decelerate' as const, factor: 1.4 },
                  },
                  translationY: {
                    from: -14,
                    duration: 280,
                    interpolation: { type: 'fastOutSlowIn' as const },
                  },
                },
                {
                  id: NAV_SHEAR_NATIVE_IDS.playDetail_player,
                  alpha: {
                    from: 0,
                    duration: 260,
                    interpolation: { type: 'decelerate' as const, factor: 1.4 },
                  },
                  translationY: {
                    from: 18,
                    duration: 280,
                    interpolation: { type: 'fastOutSlowIn' as const },
                  },
                },
              ],
              content: {
                enter: {
                  alpha: {
                    from: 0,
                    to: 1,
                    duration: 180,
                    interpolation: { type: 'decelerate' as const, factor: 1.8 },
                  },
                },
              },
            },
            pop: buildPlayDetailPopAnimation(winWidth, winHeight),
          },
        },
      },
    })
  })
}
export function pushSonglistDetailScreen(componentId: string, info: ListInfoItem) {
  if (Boolean(commonState.componentIds.songlistDetail) || !acquireNavPushLock('songlistDetail')) return
  const theme = themeState.theme

  requestAnimationFrame(() => {
    void Navigation.push(componentId, {
      component: {
        name: SONGLIST_DETAIL_SCREEN,
        passProps: {
          info,
        },
        options: {
          topBar: {
            visible: false,
            height: 0,
            drawBehind: false,
          },
          statusBar: {
            drawBehind: true,
            visible: true,
            style: getStatusBarStyle(theme.isDark),
            backgroundColor: 'transparent',
          },
          navigationBar: {
            // visible: false,
            backgroundColor: 'transparent',
          },
          layout: {
            componentBackgroundColor: getScreenSurfaceBackground(theme),
          },
          animations: {
            push: {
              waitForRender: true,
              sharedElementTransitions: [
                {
                  fromId: `${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_from_${info.id}`,
                  toId: `${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_to_${info.id}`,
                  interpolation: { type: 'spring' },
                },
              ],
              elementTransitions: [
                {
                  id: NAV_SHEAR_NATIVE_IDS.songlistDetail_title,
                  alpha: {
                    from: 0, // We don't declare 'to' value as that is the element's current alpha value, here we're essentially animating from 0 to 1
                    duration: 300,
                  },
                  translationX: {
                    from: 16, // Animate translationX from 16dp to 0dp
                    duration: 300,
                  },
                },
              ],
              // content: {
              //   scaleX: {
              //     from: 1.2,
              //     to: 1,
              //     duration: 200,
              //   },
              //   scaleY: {
              //     from: 1.2,
              //     to: 1,
              //     duration: 200,
              //   },
              //   alpha: {
              //     from: 0,
              //     to: 1,
              //     duration: 200,
              //   },
              // },
            },
            pop: {
              sharedElementTransitions: [
                {
                  fromId: `${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_to_${info.id}`,
                  toId: `${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_from_${info.id}`,
                  interpolation: { type: 'spring' },
                },
              ],
              elementTransitions: [
                {
                  id: NAV_SHEAR_NATIVE_IDS.songlistDetail_title,
                  alpha: {
                    to: 0, // We don't declare 'to' value as that is the element's current alpha value, here we're essentially animating from 0 to 1
                    duration: 300,
                  },
                  translationX: {
                    to: 16, // Animate translationX from 16dp to 0dp
                    duration: 300,
                  },
                },
              ],
              // content: {
              //   alpha: {
              //     from: 1,
              //     to: 0,
              //     duration: 200,
              //   },
              // },
            },
          },
        },
      },
    })
  })
}
const buildPageSlidePushAnimation = (winWidth: number) => {
  const safeW = Math.max(Math.round(winWidth), 320)
  const parallaxX = -Math.round(safeW * 0.28)
  return {
    waitForRender: true,
    content: {
      enter: {
        translationX: {
          from: safeW,
          to: 0,
          duration: 300,
          interpolation: { type: 'decelerate' as const, factor: 2.2 },
        },
      },
      exit: {
        translationX: {
          from: 0,
          to: parallaxX,
          duration: 300,
          interpolation: { type: 'decelerate' as const, factor: 2.2 },
        },
      },
    },
  }
}

const buildPageSlidePopAnimation = (winWidth: number) => {
  const safeW = Math.max(Math.round(winWidth), 320)
  const parallaxX = -Math.round(safeW * 0.28)
  return {
    content: {
      exit: {
        translationX: {
          from: 0,
          to: safeW,
          duration: 250,
          interpolation: { type: 'fastOutSlowIn' as const },
        },
      },
      enter: {
        translationX: {
          from: parallaxX,
          to: 0,
          duration: 250,
          interpolation: { type: 'fastOutSlowIn' as const },
        },
      },
    },
  }
}

export function pushCommentScreen(componentId: string) {
  if (Boolean(commonState.componentIds.comment) || !acquireNavPushLock('comment')) return
  /*
    Navigation.setDefaultOptions({
      topBar: {
        background: {
          color: '#039893',
        },
        title: {
          color: 'white',
        },
        backButton: {
          title: '', // Remove previous screen name from back button
          color: 'white',
        },
        buttonColor: 'white',
      },
      statusBar: {
        style: 'light',
      },
      layout: {
        orientation: ['portrait'],
      },
      bottomTabs: {
        titleDisplayMode: 'alwaysShow',
      },
      bottomTab: {
        textColor: 'gray',
        selectedTextColor: 'black',
        iconColor: 'gray',
        selectedIconColor: 'black',
      },
    })
  */
  requestAnimationFrame(() => {
    const theme = themeState.theme
    const winWidth = Math.max(windowSizeTools.getSize().width, 320)

    void Navigation.push(componentId, {
      component: {
        name: COMMENT_SCREEN,
        options: {
          topBar: {
            visible: false,
            height: 0,
            drawBehind: false,
          },
          statusBar: {
            drawBehind: true,
            visible: true,
            style: getStatusBarStyle(theme.isDark),
            backgroundColor: 'transparent',
          },
          navigationBar: {
            // visible: false,
            backgroundColor: 'transparent',
          },
          layout: {
            componentBackgroundColor: getScreenSurfaceBackground(theme),
          },
          animations: {
            push: buildPageSlidePushAnimation(winWidth),
            pop: buildPageSlidePopAnimation(winWidth),
          },
        },
      },
    })
  })
}

export function pushSettingScreen(componentId: string) {
  if (Boolean(commonState.componentIds.setting) || !acquireNavPushLock('setting')) return
  requestAnimationFrame(() => {
    const theme = themeState.theme
    const winWidth = Math.max(windowSizeTools.getSize().width, 320)

    void Navigation.push(componentId, {
      component: {
        name: SETTING_SCREEN,
        options: {
          topBar: {
            visible: false,
            height: 0,
            drawBehind: false,
          },
          statusBar: {
            drawBehind: true,
            visible: true,
            style: getStatusBarStyle(theme.isDark),
            backgroundColor: 'transparent',
          },
          navigationBar: {
            backgroundColor: 'transparent',
          },
          layout: {
            componentBackgroundColor: getScreenSurfaceBackground(theme),
          },
          animations: {
            push: buildPageSlidePushAnimation(winWidth),
            pop: buildPageSlidePopAnimation(winWidth),
          },
        },
      },
    })
  })
}

export function popSettingScreen(componentId: string) {
  const { width } = windowSizeTools.getSize()
  void Navigation.pop(componentId, {
    animations: {
      pop: buildPageSlidePopAnimation(width),
    },
  })
}

/*
export function pushSingleScreenApp() {
  Navigation.setRoot({
    root: {
      stack: {
        children: [{
          component: {
            name: SINGLE_APP_SCREEN,
            options: {
              topBar: {
                title: {
                  text: 'SINGLE SCREEN APP',
                },
                leftButtons: [
                  {
                    id: 'nav_user_btn',
                    icon: require('assets/icons/ic_nav_user.png'),
                    color: 'white',
                  },
                ],
                rightButtons: [
                  {
                    id: 'nav_logout_btn',
                    icon: require('assets/icons/ic_nav_logout.png'),
                    color: 'white',
                  },
                ],
              },
            },
          },
        }],
      },
    },
  })
}

export function pushTabBasedApp() {
  Navigation.setRoot({
    root: {
      bottomTabs: {
        children: [{
          stack: {
            children: [{
              component: {
                name: TAB1_SCREEN,
                options: {
                  topBar: {
                    title: {
                      text: 'TAB 1',
                    },
                    leftButtons: [
                      {
                        id: 'nav_user_btn',
                        icon: require('assets/icons/ic_nav_user.png'),
                        color: 'white',
                      },
                    ],
                    rightButtons: [
                      {
                        id: 'nav_logout_btn',
                        icon: require('assets/icons/ic_nav_logout.png'),
                        color: 'white',
                      },
                    ],
                  },
                },
              },
            }],
            options: {
              bottomTab: {
                icon: require('assets/icons/ic_tab_home.png'),
                testID: 'FIRST_TAB_BAR_BUTTON',
                text: 'Tab1',
              },
            },
          },
        },
        {
          stack: {
            children: [{
              component: {
                name: TAB2_SCREEN,
                options: {
                  topBar: {
                    title: {
                      text: 'TAB 2',
                    },
                    leftButtons: [
                      {
                        id: 'nav_user_btn',
                        icon: require('assets/icons/ic_nav_user.png'),
                        color: 'white',
                      },
                    ],
                    rightButtons: [
                      {
                        id: 'nav_logout_btn',
                        icon: require('assets/icons/ic_nav_logout.png'),
                        color: 'white',
                      },
                    ],
                  },
                },
              },
            }],
            options: {
              bottomTab: {
                icon: require('assets/icons/ic_tab_menu.png'),
                testID: 'SECOND_TAB_BAR_BUTTON',
                text: 'Tab2',
              },
            },
          },
        }],
      },
    },
  })
}
 */
