<p align="center"><a href="https://github.com/startips/Xmusic"><img width="160" src="./doc/images/xmusic-logo.png" alt="Xmusic logo"></a></p>

<h1 align="center">Xmusic</h1>

<p align="center">
  <a href="https://github.com/startips/Xmusic/releases"><img src="https://img.shields.io/github/release/startips/Xmusic" alt="Release version"></a>
  <a href="https://github.com/facebook/react-native"><img src="https://img.shields.io/github/package-json/dependency-version/startips/Xmusic/react-native/master" alt="React Native version"></a>
  <a href="https://kotlinlang.org/"><img src="https://img.shields.io/badge/Android-100%25%20Kotlin-7F52FF?logo=kotlin&logoColor=white" alt="Android 100% Kotlin"></a>
  <a href="https://github.com/startips/Xmusic/blob/master/LICENSE"><img src="https://img.shields.io/github/license/startips/Xmusic" alt="License"></a>
</p>

<p align="center">一个基于 LX Music 移动版深度重构的 Android 音乐播放器，采用 Material 3 Expressive 视觉体系与全量 Kotlin 原生音频 / 存储引擎</p>

---

## 核心特性

### 1. 全量 Kotlin 原生底座与自研 Media3 播放引擎

- **Android 原生层 100% Kotlin 化**：原生业务与自定义视图已全面重构为 Kotlin（`main` 源码共 65 个 `.kt` 文件、0 个 `.java` 文件），全面采用 Kotlin 协程管理异步任务并随桥接生命周期自动回收，消除遗留裸线程与 `AsyncTask` 隐患。
- **自研 AndroidX Media3 播放内核**：基于 `ExoPlayer 1.8.0` 内化实现 `XmusicPlaybackService` 与 `XmusicPlayerController`，彻底移除 `react-native-track-player` 及其 21 处第三方源码补丁，支持音频焦点管理、AudioOffload、倍速播放与后台/多任务划掉彻底释放。
- **零 GC 浮点 DSP 音效引擎**：原生内置 `XmusicDspAudioProcessor`，在音频线程采用纯基本类型数组零分配运算，支持 5 段参量均衡器（`60 / 230 / 910 / 3600 / 14000 Hz`）、多曲风预设、85Hz 低音增强、响度增益与软拐点限幅；配合 60fps 柔和启停包络与 0–5 秒切歌淡入淡出，消除启停爆音与卡顿。
- **全曲后台缓存与下一曲预拉取**：基于 Media3 `SimpleCache` 实现 `PlayerMediaCache`，支持边听边存全曲音频与低优先级下一曲首段预加载，兼顾弱网流畅度与缓存上限自动淘汰。
- **原生 SQLite WAL 存储引擎**：自研 `XmusicStorageEngine`（SQLite WAL + 256K 字符阈值大值文件原子溢出），取代旧版 `AsyncStorage` 分片方案，突破 `CursorWindow` 限制并支持老版本升级首次启动无损自动迁移。
- **高性能原生辅助管线**：单线程协程亲和的 QuickJS 自定义源沙箱（`QuickJsEngine`）、原生 OkHttp 协程下载器（`NativeDownloadHelper`）、Glide 统一封面与 24 色相桶取色管线（`CoverArtworkRepository` / `CoverPaletteExtractor`），以及后台 JS 定时器防冻结机制。

### 2. Material 3 Expressive 视觉与动效

- **Xmusic 品牌标识与原生声波启动页**：启用浅薄荷叠色几何音符「X♪」视觉标识，提供全密度自适应图标、Android 13+ 单色主题图标及状态栏单色通知小图标；冷启动配备 `XmusicSplashOverlay` 原生声波流体动画，实时同步当前主题种子色与明暗模式。
- **流体动态主题系统**：基于统一的 M3E 语义色系与圆角规范（`src/theme/m3.ts`），内置 6 套种子色预设（翡翠绿、晴空蓝、鸢尾紫、珊瑚粉、琥珀金、岩青灰），支持专辑封面主色实时流转与 120Hz 原生微抖动防色带流体网格背景（`FluidBgView`），适配跟随系统 / 浅色 / 深色模式。
- **波浪进度条与沉浸式转场**：播放详情页与底部播放栏均配备 M3E 波浪形进度条（`WavyProgressView`）；全宽双向 Alpha 羽化封面支持共享元素同步展开与仿 macOS Dock 边缘侧滑弧线回落动效（含落地弹性微震）。
- **方向感知导航与精简交互**：主页切换采用方向感知 Shared-Axis 微滑浮现动画，底部/侧边导航与设置页 6 大分组顶栏均配备流体滑动胶囊指示器；歌单页将「打开歌单」收纳至顶栏图标按钮并保留左侧滑出分类抽屉。

### 3. 播放、音质与歌词体验

- **音质切换与实时解码诊断**：播放详情页内置「音质与解码」面板，展示当前实际解码格式、采样率与码率，自动识别假无损、降级与自动换源状态，支持一键切换标准（128k）/ HQ 高品质（320k）/ SQ 无损（FLAC）/ 24bit 母带。
- **逐字卡拉 OK 歌词与金句海报**：支持逐字扫词、四阶景深呼吸缩放、点击歌词跳转进度、空状态与重试交互，以及长按生成多行「歌词金句分享海报」（支持保存系统相册与原生分享）。
- **队列与蓝牙/微件歌词**：配备「稍后播放」可视化队列抽屉与全局线性马达细腻触感反馈；移除冗余悬浮桌面歌词窗，保留蓝牙 AVRCP 与桌面微件实时歌词推送。

### 4. 系统生态、隐私统计与更新通道

- **桌面微件与澎湃 OS 超级岛适配**：提供 4×1 灵动胶囊与 4×2 黑胶歌词卡两款 M3 桌面小组件；媒体会话写入 768px 高清封面位图，适配小米澎湃 OS 超级岛、下拉媒体面板与锁屏切歌稳态显示及一键免弹窗红心收藏。
- **纯本地隐私听歌足迹**：在「我的列表」顶栏设置按钮旁提供纯本机存储的听歌足迹面板，支持查看听歌时长、偏爱歌手与常听排行，并可一键同步「常听 Top 50」智能歌单。
- **稳定版 / 开发版双更新通道**：支持在「设置 → 更新与关于」中按需切换稳定版与 `dev` 预览通道；采用首页设置按钮红点静默提醒，告别启动弹窗打断。
- **多尺寸自适应与独立共存**：全面适配手机竖屏、横屏四边沉浸式分栏（含挖孔/安全区避让）及平板/折叠屏多列排布；使用独立包名 `com.startips.xmusic`，可与原版应用同机共存。

---

## 技术栈与原生架构

### 主要技术栈

- **跨端框架**：React Native `0.73`（Hermes）、TypeScript、React `18.2`
- **导航与手势**：`react-native-navigation`、`react-native-pager-view`
- **Android 原生核心**：Kotlin `1.9`（JVM 17）+ `kotlinx-coroutines-android`
- **音频与媒体**：AndroidX Media3 (`ExoPlayer 1.8.0` / `SimpleCache`)、自研浮点 DSP、`androidx.media`
- **图像、脚本与存储**：Glide `4.15`、QuickJS (`wrapper-android`)、SQLite WAL + 文件溢出引擎

### Android 原生模块布局（`android/app/src/main/java/cn/toside/music/mobile/`）

| 包路径 | 核心职责 |
| :--- | :--- |
| `player/` | `XmusicPlaybackService`、`XmusicPlayerController`、`AudioEffectModule`、`player/dsp/` 浮点音效处理器、`player/cache/` Media3 缓存预加载、`player/session/` 媒体通知与超级岛适配 |
| `storage/` | `XmusicStorageEngine`（SQLite WAL + 大值文件溢出 + 旧版 `RKStorage`/`AsyncStorage` 分片无损迁移） |
| `splash/` | `XmusicSplashOverlay`、`SplashThemeStore`（M3E 声波流体冷启动动画与主题同步） |
| `artwork/` | `CoverArtworkRepository`、`CoverPaletteExtractor`（Glide 共享封面加载与主色提取） |
| `view/` | `FluidBgView`、`WavyProgressView`、`FadeImageView`、`EdgeSwipeView`、`EdgeToEdgeModalView`、`AlphaFadeView`、`LinearGradientView`、`SolidHeartView` |
| `widget/` | `XmusicCapsuleWidgetProvider`（4×1）、`XmusicCardWidgetProvider`（4×2）、`XmusicWidgetUpdater`、`XmusicWidgetActionReceiver` |
| `userApi/` | `QuickJsEngine`、`QuickJsConsole`、`UserApiModule`（单线程协程 QuickJS 自定义源沙箱） |
| `lyric/` | `Lyric`、`LyricPlayer`、`LyricModule`（LRC 解析与蓝牙/微件歌词调度） |
| `crypto/`、`cache/`、`utils/`、`core/` | `AES`/`RSA` 加解密、缓存统计清理、OkHttp 协程下载、海报名片分享、安全区/触感/权限工具及协程生命周期底座 |

---

## 支持平台与下载

- **系统要求**：Android 5.0 及以上（`minSdkVersion = 21`，`compileSdkVersion = 36`）
- **支持架构**：
  - `arm64-v8a`（绝大多数现代 64 位设备推荐）
  - `armeabi-v7a`（老旧 32 位设备）
  - `universal`（全架构通用包）

> **注**：本项目专注于 Android 端，没有计划支持 iOS 和 HarmonyOS NEXT。

- **安装包下载**：[GitHub Releases](https://github.com/startips/Xmusic/releases)（`master` 分支自动发布正式版；`dev` 分支自动构建 `dev` 预发布预览版）
- **问题反馈**：[GitHub Issues](https://github.com/startips/Xmusic/issues)
- **变更记录**：[CHANGELOG.md](./CHANGELOG.md)
- **使用常见问题**：可参阅上游原版文档 [移动版常见问题](https://lyswhut.github.io/lx-music-doc/mobile/faq) 与 [音乐播放列表机制](https://lyswhut.github.io/lx-music-doc/mobile/faq/playlist)

---

## 本地开发、测试与构建

### 环境准备

- Node.js `>= 18`（见 `.nvmrc`）、npm `>= 8.5.2`
- JDK 17 与 Android SDK（环境搭建基础可参考原版[源码使用方法](https://lyswhut.github.io/lx-music-doc/mobile/use-source-code)）

### 常用命令

```bash
# 安装依赖（postinstall 会自动执行 dependencies-patch.js 修补 react-native-navigation）
npm ci

# 代码规范与类型检查
npm run lint
npx tsc --noEmit

# 运行 Android 原生单元测试
cd android && ./gradlew testDebugUnitTest

# 构建 Debug APK
cd android && ./gradlew assembleDebug

# 构建 Release APK（需提前配置 android/keystore.properties 或传入 -PMYAPP_UPLOAD_* 签名参数）
cd android && ./gradlew assembleRelease
```

### 数据同步服务

如需跨设备同步本地歌单，可部署上游独立的[数据同步服务](https://github.com/lyswhut/lx-music-sync-server#readme)作为私人多端同步服务端使用。

---

## 贡献代码

欢迎提交 PR 或 Issue：

- 提交新功能建议或较大界面改动前，建议先在 [Issues](https://github.com/startips/Xmusic/issues) 中说明想法；
- 修复 Bug 时，请尽量附上机型、Android 版本、复现步骤与前后对比截图。

---

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
