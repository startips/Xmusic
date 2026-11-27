import { memo, useState, useEffect, useMemo } from 'react'
import { TouchableOpacity, View } from 'react-native'

import Section from '../components/Section'
import SubTitle from '../components/SubTitle'
import Button from '../components/Button'
import { compareVer, sizeFormate } from '@/utils'

import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useHasNewVersion, useVersionDownloadProgressUpdated, useVersionInfo } from '@/store/version/hook'
import Text from '@/components/common/Text'
import { ExpressiveButtonGroup } from '@/components/common/m3e/ExpressiveButtonGroup'
import { showModal, switchUpdateChannel } from '@/core/version'
import { M3Radius, withAlpha } from '@/theme/m3'
import { hapticTick } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

const CHANNEL_LIST: LX.UpdateChannel[] = ['stable', 'dev']

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const versionInfo = useVersionInfo()
  const currentVer = versionInfo.version || process.versions.app
  const updateChannel = useSettingValue('common.updateChannel') ?? 'stable'
  const hasNewVersion = useHasNewVersion()
  const [title, setTitle] = useState('')
  const [tip, setTip] = useState('')
  const progress = useVersionDownloadProgressUpdated()
  const badgeColor = theme.isDark ? '#FF453A' : '#E53935'
  const isDevInstalled = currentVer.includes('-')
  const isDevNewVersion = versionInfo.newVersion?.channel === 'dev' || (versionInfo.newVersion?.version?.includes('-') ?? false)

  const channelOptions = useMemo(() => {
    return CHANNEL_LIST.map(id => ({
      id,
      label: t(`setting_version_channel_${id}`),
    }))
  }, [t])

  const handleOpenVersionModal = () => {
    hapticTick()
    showModal()
  }

  useEffect(() => {
    if (versionInfo.isLatest) {
      const aheadStable = updateChannel === 'stable' &&
        versionInfo.newVersion?.version &&
        compareVer(currentVer, versionInfo.newVersion.version) > 0
      setTitle(t('version_tip_latest'))
      setTip(aheadStable ? t('version_tip_dev_ahead') : '')
    } else if (versionInfo.isUnknown) {
      setTitle(t('version_title_unknown'))
      setTip(t('version_tip_unknown'))
    } else {
      switch (versionInfo.status) {
        case 'downloading':
          setTitle(t('version_title_new'))
          setTip(t('version_btn_downloading', {
            total: sizeFormate(progress.total),
            current: sizeFormate(progress.current),
            progress: progress.total ? (progress.current / progress.total * 100).toFixed(2) : '0',
          }))
          break
        case 'downloaded':
          setTitle(t('version_title_update'))
          setTip('')
          break
        case 'checking':
          setTitle(t('version_title_checking'))
          setTip('')
          break
        case 'error':
          setTitle(t('version_title_failed'))
          setTip(t('version_tip_failed'))
          break
        default:
          setTitle(t('version_title_new'))
          setTip('')
          break
      }
    }
  }, [currentVer, progress, t, updateChannel, versionInfo])

  return (
    <Section title={t('setting_version')}>
      <SubTitle title={t('setting_version_channel')}>
        <ExpressiveButtonGroup
          size="sm"
          tone="secondary"
          containerColor={theme['m3-surface-container-high']}
          value={updateChannel}
          onChange={switchUpdateChannel}
          options={channelOptions}
          style={styles.channelGroup}
        />
        <Text size={12.5} color={updateChannel === 'dev' ? theme['m3-primary'] : theme['m3-on-surface-variant']} style={styles.channelTip}>
          {t(updateChannel === 'dev' ? 'setting_version_channel_dev_tip' : 'setting_version_channel_stable_tip')}
        </Text>
      </SubTitle>
      <SubTitle title={title}>
        {hasNewVersion && versionInfo.newVersion?.version
          ? (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={handleOpenVersionModal}
                style={{
                  ...styles.newBanner,
                  backgroundColor: withAlpha(theme['m3-primary-container'], 0.72),
                  borderColor: withAlpha(theme['m3-primary'], 0.35),
                }}
              >
                <View style={styles.newBannerRow}>
                  <View style={{ ...styles.newDot, backgroundColor: badgeColor }} />
                  <Text size={13.5} style={styles.newBannerText} color={theme['m3-on-primary-container']}>
                    v{versionInfo.newVersion.version}
                  </Text>
                  {isDevNewVersion
                    ? (
                        <View style={{ ...styles.channelBadge, backgroundColor: theme['m3-secondary-container'] }}>
                          <Text size={10.5} style={styles.channelBadgeText} color={theme['m3-on-secondary-container']}>
                            {t('version_channel_dev_badge')}
                          </Text>
                        </View>
                      )
                    : null}
                </View>
                <Text size={12.5} style={styles.newBannerAction} color={theme['m3-primary']}>
                  {t('version_btn_new')} →
                </Text>
              </TouchableOpacity>
            )
          : null}
        <View style={styles.desc}>
          <View style={styles.verLine}>
            <Text size={14} color={theme['m3-on-surface']}>
              {t('version_label_latest_ver')}{versionInfo.newVersion?.version ?? '--'}
            </Text>
            {isDevNewVersion
              ? (
                  <View style={{ ...styles.channelBadge, backgroundColor: theme['m3-secondary-container'] }}>
                    <Text size={10.5} style={styles.channelBadgeText} color={theme['m3-on-secondary-container']}>
                      {t('version_channel_dev_badge')}
                    </Text>
                  </View>
                )
              : null}
          </View>
          <View style={styles.verLine}>
            <Text size={14} color={theme['m3-on-surface-variant']}>
              {t('version_label_current_ver')}{currentVer}
            </Text>
            {isDevInstalled
              ? (
                  <View style={{ ...styles.channelBadge, backgroundColor: theme['m3-surface-container-high'] }}>
                    <Text size={10.5} style={styles.channelBadgeText} color={theme['m3-primary']}>
                      {t('version_channel_dev_badge')}
                    </Text>
                  </View>
                )
              : null}
          </View>
          {
            tip ? <Text size={13.5} color={theme['m3-primary']} style={styles.tipText}>{tip}</Text> : null
          }
        </View>
        <View style={styles.btnRow}>
          <View style={styles.btnWrap}>
            <Button onPress={handleOpenVersionModal}>{t('setting_version_show_ver_modal')}</Button>
            {hasNewVersion
              ? (
                  <View
                    pointerEvents="none"
                    style={{
                      ...styles.btnBadgeDot,
                      backgroundColor: badgeColor,
                      borderColor: theme['m3-surface-container'],
                    }}
                  />
                )
              : null}
          </View>
        </View>
      </SubTitle>
    </Section>
  )
})

const styles = createStyle({
  newBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: M3Radius.md,
    borderWidth: 0.8,
    marginBottom: 10,
  },
  newBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: M3Radius.full,
  },
  newBannerText: {
    fontWeight: '700',
  },
  newBannerAction: {
    fontWeight: '700',
  },
  desc: {
    marginBottom: 10,
    gap: 4,
  },
  channelGroup: {
    maxWidth: 280,
    marginTop: 4,
  },
  channelTip: {
    marginTop: 8,
    lineHeight: 18,
  },
  verLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  channelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: M3Radius.full,
  },
  channelBadgeText: {
    fontWeight: '700',
  },
  tipText: {
    marginTop: 4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnWrap: {
    position: 'relative',
  },
  btnBadgeDot: {
    position: 'absolute',
    top: -2,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: M3Radius.full,
    borderWidth: 1.5,
  },
})
