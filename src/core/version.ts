import { compareVer } from '@/utils'
import { downloadNewVersion, getVersionInfo } from '@/utils/version'
import versionActions from '@/store/version/action'
import versionState, { type InitState } from '@/store/version/state'
import { getIgnoreVersion, getIgnoreVersionFailTipTime, saveIgnoreVersion, saveIgnoreVersionFailTipTime } from '@/utils/data'
import { showVersionModal } from '@/navigation'
import { Navigation } from 'react-native-navigation'
import { toast } from '@/utils/tools'

export const showModal = () => {
  if (versionState.showModal) return
  versionActions.setVisibleModal(true)
  showVersionModal()
}

export const hideModal = (componentId: string) => {
  if (!versionState.showModal) return
  versionActions.setVisibleModal(false)
  void Navigation.dismissOverlay(componentId)
}

export const checkUpdate = async(silent = false) => {
  versionActions.setVersionInfo({ status: 'checking' })
  const savedIgnoreVer = await getIgnoreVersion()
  versionActions.setIgnoreVersion(savedIgnoreVer)
  let versionInfo: InitState['versionInfo'] = { ...versionState.versionInfo }
  try {
    const { version, desc, history } = await getVersionInfo()
    versionInfo.newVersion = {
      version,
      desc,
      history,
    }
  } catch (err) {
    versionInfo.newVersion = {
      version: '0.0.0',
      desc: '',
      history: [],
    }
  }
  if (versionInfo.newVersion.version == '0.0.0') {
    versionInfo.isUnknown = true
    versionInfo.status = 'error'
  } else {
    versionInfo.status = 'idle'
    versionInfo.isUnknown = false
    versionInfo.isLatest = compareVer(versionInfo.version, versionInfo.newVersion.version) != -1
  }

  versionActions.setVersionInfo(versionInfo)

  if (!versionInfo.isLatest && versionInfo.isUnknown) {
    if (silent) return
    const time = await getIgnoreVersionFailTipTime()
    if (Date.now() - time < 7 * 86400000) return
    saveIgnoreVersionFailTipTime(Date.now())
    toast(global.i18n.t('version_tip_unknown'))
  }
}

export const downloadUpdate = () => {
  versionActions.setVersionInfo({ status: 'downloading' })
  versionActions.setProgress({ total: 0, current: 0 })

  downloadNewVersion(versionState.versionInfo.newVersion!.version, (total: number, current: number) => {
    // console.log(total, current)
    versionActions.setProgress({ total, current })
  }).then(() => {
    versionActions.setVersionInfo({ status: 'downloaded' })
  }).catch(() => {
    versionActions.setVersionInfo({ status: 'error' })
    // console.log(err)
  })
}


export const setIgnoreVersion = (version: InitState['ignoreVersion']) => {
  versionActions.setIgnoreVersion(version)
  saveIgnoreVersion(version)
}
