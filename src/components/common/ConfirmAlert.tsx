import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View, ScrollView } from 'react-native'
import Dialog, { type DialogType } from './Dialog'
import Button from './Button'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang/index'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { M3Radius } from '@/theme/m3'

const styles = createStyle({
  main: {
    flexShrink: 1,
    marginTop: 14,
    marginHorizontal: 6,
    marginBottom: 22,
  },
  content: {
    flexGrow: 0,
    paddingHorizontal: 14,
  },
  messageText: {
    lineHeight: 21,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  btnsReversedDirection: {
    flexDirection: 'row-reverse',
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: M3Radius.full,
  },
  btnLabel: {
    fontWeight: '600',
  },
})

export interface ConfirmAlertProps {
  onCancel?: () => void
  onHide?: () => void
  onConfirm?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  title?: string
  text?: string
  cancelText?: string
  confirmText?: string
  showConfirm?: boolean
  disabledConfirm?: boolean
  reverseBtn?: boolean
  children?: React.ReactNode | React.ReactNode[]
}

export interface ConfirmAlertType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<ConfirmAlertType, ConfirmAlertProps>(({
  onHide,
  onCancel,
  onConfirm = () => {},
  keyHide,
  bgHide,
  closeBtn,
  title = '',
  text = '',
  cancelText = '',
  confirmText = '',
  showConfirm = true,
  disabledConfirm = false,
  children,
  reverseBtn = false,
}: ConfirmAlertProps, ref) => {
  const theme = useTheme()
  const t = useI18n()

  const dialogRef = useRef<DialogType>(null)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      dialogRef.current?.setVisible(visible)
    },
  }))

  const handleCancel = () => {
    onCancel?.()
    dialogRef.current?.setVisible(false)
  }

  return (
    <Dialog onHide={onHide} keyHide={keyHide} bgHide={bgHide} closeBtn={closeBtn} title={title} ref={dialogRef}>
      <View style={styles.main}>
        <ScrollView style={styles.content} keyboardShouldPersistTaps={'always'}>
          {children ?? <Text style={styles.messageText} color={theme['m3-on-surface-variant']}>{text}</Text>}
        </ScrollView>
      </View>
      <View style={{ ...styles.btns, ...(reverseBtn ? styles.btnsReversedDirection : null) }}>
        <Button style={{ ...styles.btn, backgroundColor: theme['m3-surface-container-highest'] }} onPress={handleCancel}>
          <Text style={styles.btnLabel} color={theme['m3-on-surface']}>{cancelText || t('cancel')}</Text>
        </Button>
        {showConfirm
          ? <Button style={{ ...styles.btn, backgroundColor: theme['m3-primary-container'] }} onPress={onConfirm} disabled={disabledConfirm}>
              <Text style={styles.btnLabel} color={theme['m3-on-primary-container']}>{confirmText || t('confirm')}</Text>
            </Button>
          : null}
      </View>
    </Dialog>
  )
})
