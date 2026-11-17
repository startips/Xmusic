<p align="center"><a href="https://github.com/startips/Xmusic"><img width="160" src="./doc/images/icon.png" alt="Xmusic logo"></a></p>

<h1 align="center">Xmusic</h1>

<p align="center">
  <a href="https://github.com/startips/Xmusic/releases"><img src="https://img.shields.io/github/release/startips/Xmusic" alt="Release version"></a>
  <a href="https://github.com/facebook/react-native"><img src="https://img.shields.io/github/package-json/dependency-version/startips/Xmusic/react-native/master" alt="React Native version"></a>
  <a href="https://github.com/startips/Xmusic/blob/master/LICENSE"><img src="https://img.shields.io/github/license/startips/Xmusic" alt="License"></a>
</p>

<p align="center">一个基于 LX Music 移动版二次重构的 Android 音乐播放器，采用 Material 3 Expressive 视觉体系与全新 Xmusic 品牌设计</p>

## 界面与改动亮点

- **Material 3 Expressive 界面重设计**：引入统一的 M3E 语义色系与圆角规范（`src/theme/m3.ts`），重构了悬浮底部导航栏、迷你播放条、竖屏与横屏播放详情页、歌单详情、评论页、侧边栏以及各类弹窗与菜单组件，并支持系统状态栏/底部导航栏沉浸配色同步。
- **单一 Xmusic 主题**：移除原有多套主题与自定义主题体系，应用仅保留由品牌主色自动生成的 Xmusic M3 主题，支持跟随系统 / 浅色 / 深色三种明暗模式（`src/theme/palette.ts`）。
- **小米超级岛适配**：为媒体通知补齐高清封面位图（`METADATA_KEY_ART`），修复 HyperOS 超级岛展开态封面模糊、内容未铺满卡片的问题。
- **全新 Xmusic 品牌与图标体系**：启用丝带音符「X♪」视觉标识，提供全密度启动图标、Android 8.0+ 自适应图标、Android 13+ 单色桌面主题图标、状态栏单色通知小图标及对应启动页。
- **多尺寸屏幕自适应**：结合 `375×667` 动态缩放基线与系统字体缩放限制，兼顾窄屏手机、横屏播放详情以及平板/折叠屏多列歌单排布。
- **独立应用配置**：使用独立 Android 包名 `com.startips.xmusic`，可与原版应用同机共存互不覆盖。

## 说明

所用主要技术栈：

- React Native（`0.73`）
- TypeScript
- react-native-navigation
- react-native-track-player

已支持的平台：

- Android 5.0 及以上（`minSdkVersion = 21`）

***注：本项目专注于 Android 端，没有计划支持 iOS 和 HarmonyOS NEXT。***

- 安装包下载：[GitHub Releases](https://github.com/startips/Xmusic/releases)
- 问题反馈：[GitHub Issues](https://github.com/startips/Xmusic/issues)
- 变更记录：[CHANGELOG.md](./CHANGELOG.md)
- 使用常见问题请参阅原版文档：[移动版常见问题](https://lyswhut.github.io/lx-music-doc/mobile/faq) 与 [音乐播放列表机制](https://lyswhut.github.io/lx-music-doc/mobile/faq/playlist)。

### 本地开发与构建

环境搭建可先参考原版[源码使用方法](https://lyswhut.github.io/lx-music-doc/mobile/use-source-code)：

```bash
# 安装依赖
npm ci

# 代码检查
npm run lint

# 构建 Android Release 安装包
cd android && ./gradlew assembleRelease
```

### 数据同步服务

如需跨设备同步本地歌单，可部署原版独立的[数据同步服务](https://github.com/lyswhut/lx-music-sync-server#readme)作为私人多端同步服务端使用。

## 贡献代码

欢迎提交 PR 或 Issue：

- 提交新功能建议或较大界面改动前，建议先在 [Issues](https://github.com/startips/Xmusic/issues) 中说明想法；
- 修复 Bug 时，请尽量附上机型、Android 版本、复现步骤与前后对比截图。

## 项目协议

本项目基于 [Apache License 2.0](./LICENSE) 许可证发行，延续原项目对 Apache License 2.0 的补充协议条款；如有冲突，以以下协议为准。

---

*词语约定：本协议中的“本项目”指 Xmusic 及其上游项目 LX Music（洛雪音乐）移动版；“使用者”指签署本协议的使用者；“官方音乐平台”指对本项目内置的包括酷我、酷狗、咪咕等音乐源的官方平台统称；“版权数据”指包括但不限于图像、音频、名字等在内的他人拥有所属版权的数据。*

### 一、数据来源

1.1 本项目的各官方平台在线数据来源原理是从其公开服务器中拉取数据（与未登录状态在官方平台 APP 获取的数据相同），经过对数据简单地筛选与合并后进行展示，因此本项目不对数据的合法性、准确性负责。

1.2 本项目本身没有获取某个音频数据的能力，本项目使用的在线音频数据来源来自软件设置内“自定义源”设置所选择的“源”返回的在线链接。例如播放某首歌，本项目所做的只是将希望播放的歌曲名、艺术家等信息传递给“源”，若“源”返回了一个链接，则本项目将认为这就是该歌曲的音频数据而进行使用，至于这是不是正确的音频数据本项目无法校验其准确性，所以使用本项目的过程中可能会出现希望播放的音频与实际播放的音频不对应或者无法播放的问题。

1.3 本项目的非官方平台数据（例如“我的列表”内列表）来自使用者本地系统或者使用者连接的同步服务，本项目不对这些数据的合法性、准确性负责。

### 二、版权数据

2.1 使用本项目的过程中可能会产生版权数据。对于这些版权数据，本项目不拥有它们的所有权。为了避免侵权，使用者务必在 **24 小时内** 清除使用本项目的过程中所产生的版权数据。

### 三、音乐平台别名

3.1 本项目内的官方音乐平台别名为本项目内对官方音乐平台的一个称呼，不包含恶意。如果官方音乐平台觉得不妥，可联系本项目更改或移除。

### 四、资源使用

4.1 本项目内使用的部分包括但不限于字体、图片等资源来源于互联网。如果出现侵权可联系本项目移除。

### 五、免责声明

5.1 由于使用本项目产生的包括由于本协议或由于使用或无法使用本项目而引起的任何性质的任何直接、间接、特殊、偶然或结果性损害（包括但不限于因商誉损失、停工、计算机故障或故障引起的损害赔偿，或任何及所有其他商业损害或损失）由使用者负责。

### 六、使用限制

6.1 本项目完全免费，且开源发布于 GitHub 面向全世界人用作对技术的学习交流。本项目不对项目内的技术可能存在违反当地法律法规的行为作保证。

6.2 **禁止在违反当地法律法规的情况下使用本项目。** 对于使用者在明知或不知当地法律法规不允许的情况下使用本项目所造成的任何违法违规行为由使用者承担，本项目不承担由此造成的任何直接、间接、特殊、偶然或结果性责任。

### 七、版权保护

7.1 音乐平台不易，请尊重版权，支持正版。

### 八、非商业性质

8.1 本项目仅用于对技术可行性的探索及研究，不接受任何商业（包括但不限于广告等）合作及捐赠。

### 九、接受协议

9.1 若你使用了本项目，即代表你接受本协议。

---

## 原作者与上游仓库

本项目基于 **lyswhut** 开发的开源项目二次修改而来，感谢原作者的长期维护与开源贡献：

- 原项目仓库（LX Music 移动版）：<https://github.com/lyswhut/lx-music-mobile>
- 桌面版项目仓库（LX Music Desktop）：<https://github.com/lyswhut/lx-music-desktop>
- 原项目说明与发展动态：<https://github.com/lyswhut/lx-music-desktop/issues/1912>
- 若对原项目协议有疑问请 mail to: `lyswhut+qq.com`（请将 `+` 替换成 `@`）
