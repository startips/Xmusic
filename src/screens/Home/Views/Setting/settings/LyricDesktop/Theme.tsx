import { updateSetting } from '@/core/common'
import { setDesktopLyricColor } from '@/core/desktopLyric'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { memo } from 'react'
import { StyleSheet, View, TouchableOpacity } from 'react-native'

import SubTitle from '../../components/SubTitle'

const themes = [
  ['#08e664', 'rgba(0,0,0,0.6)'],
  ['#fffa12', 'rgba(0,0,0,0.6)'],
  ['#019ce4', 'rgba(0,0,0,0.6)'],
  ['#ff1222', 'rgba(0,0,0,0.6)'],
  ['#ef6976', 'rgba(0,0,0,0.6)'],
  ['#c851d4', 'rgba(0,0,0,0.6)'],
  ['#ffa600', 'rgba(0,0,0,0.6)'],
  ['#000000', '#ffffff'],
  ['#ffffff', 'rgba(0,0,0,0.6)'],
] as const
type Theme = typeof themes[number]

const ThemeItem = ({ color, isActive, borderColor, change }: {
  color: Theme
  isActive: boolean
  borderColor: string
  change: (color: Theme) => void
}) => {
  return (
    <TouchableOpacity style={styles.item} activeOpacity={0.65} onPress={() => { change(color) }}>
      <View
        style={{
          ...styles.colorContent,
          borderWidth: isActive ? 2 : 0,
          borderColor: isActive ? borderColor : 'transparent',
        }}
      >
        <View style={{ ...styles.image, backgroundColor: color[0] }}></View>
      </View>
    </TouchableOpacity>
  )
}

export default memo(() => {
  const t = useI18n()
  const appTheme = useTheme()
  const activeColor = useSettingValue('desktopLyric.style.lyricPlayedColor')

  const setThemeDesktopLyric = (color: Theme) => {
    void setDesktopLyricColor(null, color[0], color[1]).then(() => {
      updateSetting({ 'desktopLyric.style.lyricPlayedColor': color[0], 'desktopLyric.style.lyricShadowColor': color[1] })
    })
  }

  return (
    <SubTitle title={t('setting_lyric_desktop_theme')}>
      <View style={styles.list}>
        {
          themes.map((c, i) => (
            <ThemeItem
              key={i.toString()}
              color={c}
              isActive={activeColor.toLowerCase() == c[0].toLowerCase()}
              borderColor={appTheme['m3-primary']}
              change={setThemeDesktopLyric}
            />
          ))
        }
      </View>
    </SubTitle>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    marginRight: 14,
    marginTop: 6,
    alignItems: 'center',
    width: 30,
  },
  colorContent: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 22,
    height: 22,
    borderRadius: 11,
    elevation: 1,
  },
})
