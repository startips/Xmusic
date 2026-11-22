import { memo, useState, useEffect } from 'react'
import { TouchableOpacity, View } from 'react-native'

import Section from '../components/Section'
import SubTitle from '../components/SubTitle'
import Button from '../components/Button'
import { sizeFormate } from '@/utils'

import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useHasNewVersion, useVersionDownloadProgressUpdated, useVersionInfo } from '@/store/version/hook'
import Text from '@/components/common/Text'
import { showModal } from '@/core/version'
import { M3Radius, withAlpha } from '@/theme/m3'
import { hapticTick } from '@/utils/haptics'
import { createStyle } from '@/utils/tools'

const currentVer = process.versions.app

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const versionInfo = useVersionInfo()
  const hasNewVersion = useHasNewVersion()
  const [title, setTitle] = useState('')
  const [tip, setTip] = useState('')
  const progress = useVersionDownloadProgressUpdated()
  const badgeColor = theme.isDark ? '#FF453A' : '#E53935'

  const handleOpenVersionModal = () => {
    hapticTick()
    showModal()
  }

  useEffect(() => {
    if (versionInfo.isLatest) {
      setTitle(t('version_tip_latest'))
      setTip('')
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
  }, [t, versionInfo, progress])

  return (
    <Section title={t('setting_version')}>
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
                </View>
                <Text size={12.5} style={styles.newBannerAction} color={theme['m3-primary']}>
                  {t('version_btn_new')} →
                </Text>
              </TouchableOpacity>
            )
          : null}
        <View style={styles.desc}>
          <Text size={14} color={theme['m3-on-surface']}>
            {t('version_label_latest_ver')}{versionInfo.newVersion?.version ?? '--'}
          </Text>
          <Text size={14} color={theme['m3-on-surface-variant']}>
            {t('version_label_current_ver')}{currentVer}
          </Text>
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
    gap: 2,
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
