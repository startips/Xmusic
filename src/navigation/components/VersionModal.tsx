import { useMemo, useState, useEffect, memo, useCallback } from 'react'
import { View, ScrollView } from 'react-native'

import { compareVer, sizeFormate } from '@/utils'

import Button from '@/components/common/Button'
import { updateApp } from '@/utils/version'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { type VersionInfo } from '@/store/version/state'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useVersionDownloadProgressUpdated, useVersionInfo, useVersionInfoIgnoreVersionUpdated } from '@/store/version/hook'
import ModalContent from './ModalContent'
import { checkUpdate, downloadUpdate, hideModal, setIgnoreVersion } from '@/core/version'
import { M3Radius } from '@/theme/m3'
import { useBackHandler } from '@/utils/hooks/useBackHandler'

const VersionItem = ({ version, desc }: VersionInfo) => {
  return (
    <View style={styles.versionItem}>
      <Text style={styles.label}>v{version}</Text>
      <Text selectable style={styles.desc}>{desc}</Text>
    </View>
  )
}

const Content = memo(({ title, newVersionInfo }: {
  title: string
  newVersionInfo: VersionInfo | null
}) => {
  const t = useI18n()

  const history = useMemo(() => {
    if (!newVersionInfo?.history) return []
    let arr = []
    for (const ver of newVersionInfo?.history) {
      if (compareVer(currentVer, ver.version) < 0) arr.push(ver)
    }
    return arr
  }, [newVersionInfo])

  return (
    <View style={styles.main}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView style={styles.content} keyboardShouldPersistTaps={'always'}>
        <Text style={styles.label}>{t('version_label_latest_ver')}{newVersionInfo?.version}</Text>
        <Text style={styles.label}>{t('version_label_current_ver')}{currentVer}</Text>
        {
          newVersionInfo?.desc
            ? (
                <View>
                  <Text style={styles.label}>{t('version_label_change_log')}</Text>
                  <View style={{ paddingLeft: 10, marginTop: 5 }}>
                    <Text selectable style={styles.desc}>{newVersionInfo.desc}</Text>
                  </View>
                </View>
              )
            : null
        }
        {
          history.length
            ? (
                <View style={styles.history}>
                  <Text style={styles.label}>{t('version_label_history')}</Text>
                  <View style={{ paddingLeft: 10, marginTop: 5 }}>
                    {history.map((item, index) => <VersionItem key={index} version={item.version} desc={item.desc} />)}
                  </View>
                </View>
              )
            : null
        }
      </ScrollView>
    </View>
  )
})

const currentVer = process.versions.app
const VersionModal = ({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const t = useI18n()
  const versionInfo = useVersionInfo()
  const progress = useVersionDownloadProgressUpdated()
  const ignoreVersion = useVersionInfoIgnoreVersionUpdated()
  const [ignoreBtn, setIgnoreBtn] = useState({ text: t('version_btn_ignore'), show: true, disabled: false })
  const [closeBtnText, setCloseBtnText] = useState(t('version_btn_close'))
  const [confirmBtn, setConfirmBtn] = useState({ text: '', show: true, disabled: false })
  const [title, setTitle] = useState('')
  const [tip, setTip] = useState('')


  useEffect(() => {
    let ignoreBtnConfig = { ...ignoreBtn }
    if (versionInfo.isLatest) {
      setTitle(t('version_title_latest'))
      setTip('')
      ignoreBtnConfig.show = false
      setConfirmBtn({ text: t('version_btn_new'), show: false, disabled: true })
      setCloseBtnText(t('version_btn_close'))
    } else if (versionInfo.isUnknown) {
      setTitle(t('version_title_unknown'))
      setTip(t('version_tip_unknown'))
      ignoreBtnConfig.show = false
      setConfirmBtn({ text: t('version_btn_failed'), show: true, disabled: false })
      setCloseBtnText(t('version_btn_close'))
    } else {
      switch (versionInfo.status) {
        case 'downloading':
          setTitle(t('version_title_new'))
          setTip(t('version_btn_downloading', {
            total: sizeFormate(progress.total),
            current: sizeFormate(progress.current),
            progress: progress.total ? (progress.current / progress.total * 100).toFixed(2) : '0',
          }))
          if (ignoreBtnConfig.show) ignoreBtnConfig.show = false
          if (!confirmBtn.disabled) setConfirmBtn({ text: t('version_btn_update'), show: true, disabled: true })
          setCloseBtnText(t('version_btn_min'))
          break
        case 'downloaded':
          setTitle(t('version_title_update'))
          setTip('')
          if (ignoreBtnConfig.show) ignoreBtnConfig.show = false
          setConfirmBtn({ text: t('version_btn_update'), show: true, disabled: false })
          setCloseBtnText(t('version_btn_close'))
          break
        case 'checking':
          setTitle(t('version_title_checking'))
          setTip('')
          ignoreBtnConfig.show = false
          setConfirmBtn({ text: t('version_btn_new'), show: false, disabled: true })
          setCloseBtnText(t('version_btn_close'))
          break
        case 'error':
          setTitle(t('version_title_failed'))
          setTip(t('version_tip_failed'))
          ignoreBtnConfig.show = !!versionInfo.newVersion?.version
          ignoreBtnConfig.disabled = false
          setConfirmBtn({ text: t('version_btn_failed'), show: true, disabled: false })
          setCloseBtnText(t('version_btn_close'))
          break
        // case 'idle':
        //   break
        default:
          setTitle(t('version_title_new'))
          setTip('')
          ignoreBtnConfig.show = !!versionInfo.newVersion?.version
          ignoreBtnConfig.disabled = false
          setConfirmBtn({ text: t('version_btn_new'), show: true, disabled: false })
          // setTip(t('version_btn_new'))
          setCloseBtnText(t('version_btn_close'))
          break
      }
    }
    ignoreBtnConfig.text = t(versionInfo.newVersion?.version && ignoreVersion == versionInfo.newVersion.version ? 'version_btn_ignore_cancel' : 'version_btn_ignore')
    setIgnoreBtn(ignoreBtnConfig)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, versionInfo, ignoreVersion, progress])

  const handleCancel = useCallback(() => {
    hideModal(componentId)
  }, [componentId])

  useBackHandler(useCallback(() => {
    handleCancel()
    return true
  }, [handleCancel]))

  const handleIgnore = () => {
    if (!versionInfo.newVersion?.version) return
    setIgnoreVersion(ignoreVersion != versionInfo.newVersion.version ? versionInfo.newVersion.version : null)
    // handleCancel()
  }

  const handleConfirm = () => {
    if (versionInfo.isLatest || versionInfo.isUnknown) {
      void checkUpdate()
    } else if (versionInfo.status == 'downloaded') {
      void updateApp()
    } else if (versionInfo.status == 'idle' || versionInfo.status == 'error') {
      downloadUpdate()
    }
  }

  return (
    <ModalContent>
      <Content title={title} newVersionInfo={versionInfo.newVersion} />
      { tip.length ? <Text style={styles.tip} color={theme['c-primary-font']}>{tip}</Text> : null }
      <View style={styles.btns}>
        {
          ignoreBtn.show
            ? (
                <Button disabled={ignoreBtn.disabled} style={{ ...styles.btn, backgroundColor: theme['m3-surface-container-highest'] }} onPress={handleIgnore}>
                  <Text style={styles.btnLabel} color={theme['m3-on-surface']}>{ignoreBtn.text}</Text>
                </Button>
              )
            : null
        }
        <Button style={{ ...styles.btn, backgroundColor: theme['m3-surface-container-highest'] }} onPress={handleCancel}>
          <Text style={styles.btnLabel} color={theme['m3-on-surface']}>{closeBtnText}</Text>
        </Button>
        {
          confirmBtn.show
            ? (
                <Button disabled={confirmBtn.disabled} style={{ ...styles.btn, backgroundColor: theme['m3-primary-container'] }} onPress={handleConfirm}>
                  <Text style={styles.btnLabel} color={theme['m3-on-primary-container']}>{confirmBtn.text}</Text>
                </Button>
              )
            : null
        }
      </View>
    </ModalContent>
  )
}

const styles = createStyle({
  main: {
    // flexGrow: 0,
    flexShrink: 1,
    marginTop: 15,
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 20,
  },
  content: {
    flexGrow: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  history: {
    marginTop: 15,
  },
  versionItem: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 2,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
  },
  tip: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: M3Radius.full,
  },
  btnLabel: {
    fontWeight: '600',
  },
})

export default VersionModal

