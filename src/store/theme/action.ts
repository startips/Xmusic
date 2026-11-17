import state from './state'


export default {
  setTheme(theme: LX.ActiveTheme) {
    state.theme = theme
    global.state_event.themeUpdated(theme)
  },
  setShouldUseDarkColors(shouldUseDarkColors: boolean) {
    if (state.shouldUseDarkColors == shouldUseDarkColors) return
    state.shouldUseDarkColors = shouldUseDarkColors
  },
}
