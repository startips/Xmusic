import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'

import Section from '../components/Section'

import { createStyle, openUrl } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { showPactModal } from '@/core/common'

export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const openAuthorPage = () => {
    void openUrl('https://github.com/startips')
  }
  const openUpstreamAuthorPage = () => {
    void openUrl('https://github.com/lyswhut')
  }
  const openForkRepoPage = () => {
    void openUrl('https://github.com/startips/Xmusic')
  }
  const openGHReleasePage = () => {
    void openUrl('https://github.com/startips/Xmusic/releases')
  }
  const openIssuePage = () => {
    void openUrl('https://github.com/startips/Xmusic/issues')
  }
  const openHomePage = () => {
    void openUrl('https://github.com/lyswhut/lx-music-mobile#readme')
  }
  const openFAQPage = () => {
    void openUrl('https://lyswhut.github.io/lx-music-doc/mobile/faq')
  }
  const openPactModal = () => {
    showPactModal()
  }
  const openPartPage = () => {
    void openUrl('https://github.com/startips/Xmusic#%E9%A1%B9%E7%9B%AE%E5%8D%8F%E8%AE%AE')
  }

  const textLinkStyle = {
    ...styles.text,
    textDecorationLine: 'underline',
    color: theme['c-primary-font'],
  } as const

  return (
    <Section title={t('setting_about')}>
      <View style={styles.part}>
        <Text style={styles.text}>Xmusic 是基于开源项目 LX Music 移动版二次重构的 Android 音乐播放器，采用 Material 3 Expressive 视觉体系、动态主题与沉浸式播放体验，完全免费且开源。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>项目仓库（Xmusic）：</Text>
        <TouchableOpacity onPress={openForkRepoPage}>
          <Text style={textLinkStyle}>https://github.com/startips/Xmusic</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>版本发布页：</Text>
        <TouchableOpacity onPress={openGHReleasePage}>
          <Text style={textLinkStyle}>GitHub Releases</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>问题反馈：</Text>
        <TouchableOpacity onPress={openIssuePage}>
          <Text style={textLinkStyle}>Xmusic Issues</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>上游项目（LX Music）：</Text>
        <TouchableOpacity onPress={openHomePage}>
          <Text style={textLinkStyle}>https://github.com/lyswhut/lx-music-mobile</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>原版常见问题：</Text>
        <TouchableOpacity onPress={openFAQPage}>
          <Text style={textLinkStyle}>移动版常见问题</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>本项目仅用于技术学习、界面与交互体验研究，无广告、无引流、无商业合作，直至停止维护都将保持纯净。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>目前 Xmusic 的唯一原始发布渠道为 <Text style={styles.boldText}>GitHub</Text>，其他渠道均为第三方转载，可信度请自行鉴别。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.boldText}>本项目没有任何微信公众号或所谓「官方账号」，也未在小米、华为、vivo 等应用商店上架同名应用，谨防受骗！</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>若使用中出现<Text style={styles.boldText}>广告</Text>或<Text style={styles.boldText}>引流</Text>（如要求加群、关注公众号才能使用或升级），或升级时提示「<Text style={styles.boldText}>签名不一致</Text>」，均说明当前安装包或新安装包中至少有一方来自<Text style={styles.boldText}>非官方二次打包渠道</Text>。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>你已签署本软件的 </Text>
        <TouchableOpacity onPress={openPactModal}>
          <Text style={textLinkStyle}>许可协议</Text>
        </TouchableOpacity>
        <Text style={styles.text}>，协议在线版本可前往 </Text>
        <TouchableOpacity onPress={openPartPage}>
          <Text style={textLinkStyle}>Xmusic 项目协议</Text>
        </TouchableOpacity>
        <Text style={styles.text}> 查看。</Text>
      </View>
      <View style={styles.part}>
        <Text style={styles.text}>维护与重构：</Text>
        <TouchableOpacity onPress={openAuthorPage}>
          <Text style={textLinkStyle}>startips</Text>
        </TouchableOpacity>
        <Text style={styles.text}> · 致谢上游作者：</Text>
        <TouchableOpacity onPress={openUpstreamAuthorPage}>
          <Text style={textLinkStyle}>lyswhut</Text>
        </TouchableOpacity>
      </View>
    </Section>
  )
})

const styles = createStyle({
  part: {
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 14,
    textAlignVertical: 'bottom',
  },
  boldText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlignVertical: 'bottom',
  },
})
