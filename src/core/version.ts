import { compareVer } from '@/utils'
import { downloadNewVersion, getVersionInfo } from '@/utils/version'
import versionActions from '@/store/version/action'
import versionState, { type InitState } from '@/store/version/state'
import settingState from '@/store/setting/state'
import { updateSetting } from '@/core/common'
import { getIgnoreVersion, getIgnoreVersionFailTipTime, saveIgnoreVersion, saveIgnoreVersionFailTipTime } from '@/utils/data'
import { showVersionModal } from '@/navigation'
import { Navigation } from 'react-native-navigation'
import { toast } from '@/utils/tools'

let checkSeq = 0

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
  const seq = ++checkSeq
  const channel: LX.UpdateChannel = settingState.setting['common.updateChannel'] ?? 'stable'
  const currentVersion = process.versions.app || versionState.versionInfo.version
  versionActions.setVersionInfo({
    version: currentVersion,
    channel,
    status: 'checking',
  })
  const savedIgnoreVer = await getIgnoreVersion()
  if (seq !== checkSeq) return
  versionActions.setIgnoreVersion(savedIgnoreVer)
  let versionInfo: InitState['versionInfo'] = {
    ...versionState.versionInfo,
    version: currentVersion,
    channel,
  }
  try {
    const info = await getVersionInfo(channel)
    if (seq !== checkSeq) return
    versionInfo.newVersion = {
      version: info.version,
      desc: info.desc ?? '',
      history: info.history ?? [],
      channel: info.channel ?? channel,
      assets: info.assets,
    }
  } catch (err) {
    if (seq !== checkSeq) return
    versionInfo.newVersion = {
      version: '0.0.0',
      desc: '',
      history: [],
      channel,
    }
  }
  if (versionInfo.newVersion.version == '0.0.0') {
    versionInfo.isUnknown = true
    versionInfo.isLatest = false
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
    if (seq !== checkSeq) return
    if (Date.now() - time < 7 * 86400000) return
    saveIgnoreVersionFailTipTime(Date.now())
    toast(global.i18n.t('version_tip_unknown'))
  }
}

export const switchUpdateChannel = (channel: LX.UpdateChannel) => {
  const currentChannel: LX.UpdateChannel = settingState.setting['common.updateChannel'] ?? 'stable'
  if (currentChannel === channel) return
  if (versionState.versionInfo.status === 'downloading') {
    toast(global.i18n.t('setting_version_channel_downloading_tip'))
    return
  }
  updateSetting({ 'common.updateChannel': channel })
  setIgnoreVersion(null)
  versionActions.setVersionInfo({
    channel,
    newVersion: null,
    isUnknown: false,
    isLatest: false,
    status: 'checking',
  })
  void checkUpdate(true)
}

export const downloadUpdate = () => {
  const newVer = versionState.versionInfo.newVersion
  if (!newVer?.version || newVer.version === '0.0.0') return
  versionActions.setVersionInfo({ status: 'downloading' })
  versionActions.setProgress({ total: 0, current: 0 })

  downloadNewVersion(newVer.version, (total: number, current: number) => {
    // console.log(total, current)
    versionActions.setProgress({ total, current })
  }, newVer.assets).then(() => {
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
