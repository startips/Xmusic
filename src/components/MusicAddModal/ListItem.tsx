import { View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { M3Radius } from '@/theme/m3'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useMusicExistsList } from '@/store/list/hook'

export default ({ listInfo, onPress, musicInfo, width }: {
  listInfo: LX.List.MyListInfo
  onPress: (listInfo: LX.List.MyListInfo) => void
  musicInfo: LX.Music.MusicInfo
  width: number
}) => {
  const theme = useTheme()
  const isExists = useMusicExistsList(listInfo, musicInfo)

  const handlePress = () => {
    if (isExists) {
      toast(global.i18n.t('list_add_tip_exists'))
      return
    }
    onPress(listInfo)
  }

  return (
    <View style={{ ...styles.listItem, width }}>
      <Button
        style={{
          ...styles.button,
          backgroundColor: theme['m3-secondary-container'],
          borderColor: theme['m3-outline-variant'],
          opacity: isExists ? 0.42 : 1,
        }}
        onPress={handlePress}
      >
        <Text numberOfLines={1} size={13.5} style={styles.label} color={theme['m3-on-secondary-container']}>{listInfo.name}</Text>
      </Button>
    </View>
  )
}

export const styles = createStyle({
  listItem: {
    paddingRight: 10,
  },
  button: {
    height: 38,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: M3Radius.md,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.6,
  },
  label: {
    fontWeight: '500',
  },
})
