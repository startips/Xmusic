import { View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { M3Radius } from '@/theme/m3'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

export default ({ listInfo, onPress, width }: {
  listInfo: LX.List.MyListInfo
  onPress: (listInfo: LX.List.MyListInfo) => void
  width: number
}) => {
  const theme = useTheme()

  const handlePress = () => {
    onPress(listInfo)
  }

  return (
    <View style={{ ...styles.listItem, width }}>
      <Button
        style={{
          ...styles.button,
          backgroundColor: theme['m3-secondary-container'],
          borderColor: theme['m3-outline-variant'],
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
