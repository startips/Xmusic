import { memo } from 'react'

import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import ButtonPrimary from '@/components/common/ButtonPrimary'
import { useI18n } from '@/lang'


export interface ParseNameProps {
  fileName: string
  onNameChanged: (text: string) => void
  onSingerChanged: (text: string) => void
}

const parsePath = (fileName: string) => {
  const dotIdx = fileName.lastIndexOf('.')
  const baseName = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName
  const sepIdx = baseName.indexOf('-')
  if (sepIdx < 0) return [baseName.trim(), ''] as const
  return [baseName.substring(0, sepIdx).trim(), baseName.substring(sepIdx + 1).trim()] as const
}

export default memo(({ fileName, onNameChanged, onSingerChanged }: ParseNameProps) => {
  const theme = useTheme()
  const t = useI18n()
  const handleParseNameSinger = () => {
    const [name, singer] = parsePath(fileName)
    if (name) onNameChanged(name)
    if (singer) onSingerChanged(singer)
  }
  const handleParseSingerName = () => {
    const [singer, name] = parsePath(fileName)
    if (name) {
      onSingerChanged(singer)
      onNameChanged(name)
    } else if (singer) {
      onNameChanged(singer)
    }
  }
  return (
    <View style={styles.container}>
      <Text style={styles.label} size={14}>{t('metadata_edit_modal_form_parse_name')}</Text>
      <View style={styles.btns}>
        <ButtonPrimary style={{ backgroundColor: theme['c-button-background'] }} onPress={handleParseNameSinger}>
          <Text color={theme['c-button-font']} size={13}>{t('metadata_edit_modal_form_parse_name_singer')}</Text>
        </ButtonPrimary>
        <ButtonPrimary style={{ backgroundColor: theme['c-button-background'] }} onPress={handleParseSingerName}>
          <Text color={theme['c-button-font']} size={13}>{t('metadata_edit_modal_form_parse_singer_name')}</Text>
        </ButtonPrimary>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    // paddingLeft: 25,
    marginBottom: 15,
  },
  label: {
    marginBottom: 2,
  },
  btns: {
    marginTop: 5,
    flexDirection: 'row',
  },
})
