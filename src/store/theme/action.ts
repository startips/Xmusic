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
  setCoverPalette(seedColor: string | null, palette: string[] | null) {
    const nextPalette = palette?.length ? [...palette] : null
    const sameSeed = state.coverSeedColor == seedColor
    const samePalette =
      state.coverPalette == nextPalette ||
      (state.coverPalette != null &&
        nextPalette != null &&
        state.coverPalette.length == nextPalette.length &&
        state.coverPalette.every((c, idx) => c == nextPalette[idx]))
    if (sameSeed && samePalette) return
    state.coverSeedColor = seedColor
    state.coverPalette = nextPalette
    global.state_event.coverPaletteUpdated(nextPalette)
  },
}
