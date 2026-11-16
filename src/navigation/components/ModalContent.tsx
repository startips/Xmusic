import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { M3Radius } from '@/theme/m3'

interface Props {
  children: React.ReactNode
}


export default ({ children }: Props) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.centeredView, backgroundColor: theme['m3-scrim'] }}>
      <View
        style={{
          ...styles.modalView,
          backgroundColor: theme['m3-surface-container-high'],
          borderColor: theme['m3-outline-variant'],
        }}
      >
        {children}
      </View>
    </View>
  )
}


const styles = createStyle({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalView: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: M3Radius.xl,
    borderWidth: 0.6,
    paddingTop: 6,
    elevation: 6,
  },
})
