# Xmusic Android 原生层 Kotlin 重构计划与追踪清单

> **Single Source of Truth（唯一事实来源）**：本文档用于持续追踪 Xmusic Android 后端 / 原生层 Kotlin 重构的进度、架构边界、踩坑记录与解决方案。每次经历上下文压缩（`/compact`）或新开会话继续开发前，**请先完整阅读本文档**，确认当前所处阶段与遗留阻塞项。

---

## 一、维护约定（使用说明）

1. **任务勾选规则**
   - 未开始：`- [ ]`
   - 已完成：`- [x]`，并在条目末尾附注简短的完成说明（例如对应 commit hash、模块路径或真机/构建验证结果）。
2. **困难与问题追踪规则（切勿直接删文字）**
   - 任何时候遇到编译报错、依赖冲突、系统兼容坑点、性能回退或设计阻塞，**立即**追加到「[五、困难与问题追踪记录](#五困难与问题追踪记录issues--blockers-log)」中，格式为：
     `- [ ] [阶段标签] 问题描述与现象（复现条件 / 报错栈 / 影响范围）`
   - 问题解决后，**保留原问题描述并用删除线 `~~...~~` 标记 + 打勾**，随后紧跟解决方案，切勿直接整行删除，避免后续重踩相同坑位：
     `- [x] ~~[阶段标签] 问题描述与现象~~（解决方案：...）`
3. **阶段推进纪律**
   - 每个阶段（P0 / P1 / P2.x / P3.x）完成后，至少通过 `npm run lint` 与 `./gradlew assembleDebug`（或 `assembleRelease`）验证并提交一次独立 commit，确保随时可回滚。

---

## 二、基线快照与重构边界（Baseline & Scope）

* **基线版本**：`v2.3.1`（`versionCode = 86`，基线 commit `b1891e42`）
* **基线分支状态**：`master`、`beta`、`ui-test` 三分支在启动重构时完全对齐于 `b1891e42`
* **计划工作分支**：`refactor/kotlin-native`（在正式执行 P0 代码改造前从 `b1891e42` 切出）

### 2.1 存量原生代码与补丁规模盘点

`android/app/src/main/java/cn/toside/music/mobile/` 下当前共有 **57 个 `.java` 文件（7,631 行），0 个 `.kt` 文件**：

| 目录 / 包 | 文件数 | 行数 | 包含文件与核心职责 |
| :--- | :---: | :---: | :--- |
| 根包（`mobile/`） | 2 | 118 | `MainActivity.java`、`MainApplication.java` |
| `audio/` | 2 | 112 | `AudioEffectModule.java`、`AudioEffectPackage.java`（均衡器 / 音效参数桥接） |
| `cache/` | 4 | 208 | `CacheModule.java`、`CachePackage.java`、`CacheClearAsyncTask.java`、`Utils.java` |
| `crypto/` | 4 | 397 | `AES.java`、`RSA.java`、`CryptoModule.java`、`CryptoPackage.java` |
| `userApi/` | 8 | 553 | `QuickJS.java`、`UserApiModule.java`、`UserApiPackage.java`、`JavaScriptThread.java`、`JsHandler.java`、`HandlerWhat.java`、`Console.java`、`UtilsEvent.java` |
| `widget/` | 4 | 489 | `XmusicCapsuleWidgetProvider.java`、`XmusicCardWidgetProvider.java`、`XmusicWidgetActionReceiver.java`、`XmusicWidgetUpdater.java` |
| `utils/` | 7 | 1,427 | `UtilsModule.java`（1,138 行上帝类）、`UtilsPackage.java`、`UtilsEvent.java`、`Utils.java`、`AsyncTask.java`、`BatteryOptimizationUtil.java`、`NotificationPermissionUtil.java` |
| `lyric/` | 9 | 2,010 | `LyricModule.java`、`LyricPackage.java`、`Lyric.java`、`LyricPlayer.java`、`LyricView.java`、`LyricTextView.java`、`LyricSwitchView.java`、`LyricEvent.java`、`Utils.java` |
| `view/` | 17 | 2,317 | `FluidBgView`、`WavyProgressView`、`EdgeSwipeView`、`FadeImageView`、`AlphaFadeView`、`LinearGradientView`、`SolidHeartView`、`EdgeToEdgeModalView` 及其 `*ViewManager` + `XmusicViewPackage.java` |
| **合计** | **57** | **7,631** | **当前 100% 为 Java** |

* **`dependencies-patch.js`（962 行，28 组补丁规则）**：
  * 其中 **21 组补丁 + 2 个整文件注入类**（`XmusicDspConfig.java`、`XmusicDspAudioProcessor.java`）针对 `react-native-track-player`，约占 650 行，是当前构建链与升级最大的隐患。
  * 另外 **7 组补丁**（规则 #17、#18、#23、#25、#26、#27、#28）针对 `react-native-navigation`（`7.39.2`），负责 Edge-to-Edge 沉浸式适配与共享元素 `playDetail_pic` 过渡防飞顶/防卡死修复。

### 2.2 核心边界原则

1. **上层 UI 零破坏**：优先保持现有 `NativeModules` 名称、方法签名及事件名称/负载结构兼容（差异仅在 `src/plugins/player/` 与 `src/utils/nativeModules/` 薄封装层内部消化），`src/screens/` 与 `src/components/` 原则上不改动。
2. **收编播放器、保留导航补丁**：彻底将 `react-native-track-player` 收编为项目自有的 Kotlin Media3 原生模块并从 `package.json` 移除；继续保留 `dependencies-patch.js` 中对 `react-native-navigation` 的 7 组补丁（#17、#18、#23、#25、#26、#27、#28）。
3. **不手动翻译 `src/utils/musicSdk`**：各音乐平台音源解析（10,850 行 JS，含混淆签名算法且平台变动频繁）继续留在 JS 层；自定义源继续基于 QuickJS 沙箱运行，仅用 Kotlin 协程重构宿主引擎封装。

---

## 三、里程碑总览（Milestone Overview）

| 优先级 | 阶段 | 状态 | 核心目标与产出 | 验收门槛 |
| :---: | :--- | :---: | :--- | :--- |
| **准备** | 盘点与追踪建档 | 已完成 | 完成 `v2.3.1` 全量盘点，建立 `doc/KOTLIN_REFACTOR_PLAN.md` | 文档落盘且基线核对无误 |
| **P0** | 协程底座与构建基建 | 已完成 | 切出 `refactor/kotlin-native`，配置 Coroutines / Media3 / Proguard，搭建 `core/` 底座并迁移入口类 | Debug/Release 构建通过 + `npm run lint` 通过 |
| **P1** | 原生播放与 DSP 引擎收编 | 已完成 | 自研 Kotlin Media3 播放服务与 64-bit 内部/32-bit 浮点 DSP，移除 `react-native-track-player` 与 21 处补丁 | `lint`、`tsc --noEmit` 与 `assembleRelease`（含 R8）全部通过（真机交互待手测） |
| **P2.1** | `crypto/` + `cache/` 迁移 | 已完成 | 迁出加解密与缓存清理模块，淘汰废弃 `AsyncTask` | 字节级算法对齐，协程 IO 化，编译通过（真机自检待手测） |
| **P2.2** | `userApi/` 沙箱重构 | 已完成 | 用单线程协程调度器重写 `QuickJsEngine.kt`，淘汰裸 `Handler`/`Thread` | QuickJS 单线程亲和、协程定时器与事件桥接编译通过 |
| **P2.3** | `UtilsModule` 拆分 + `widget/` | 已完成 | 拆分 1,138 行上帝类，建立 Glide 共享封面管线消灭三连请求，迁移桌面微件 | `artwork/` + `utils/` + `widget/` 全量 Kotlin 化并编译通过 |
| **P2.4** | `lyric/` 悬浮歌词迁移 | 已完成 | 迁移 9 个悬浮歌词类，强类型 `LyricLine` 替换原始 `HashMap` 并收敛生命周期 | 悬浮窗、单双行跑马灯、Android 12+ 穿透透明度与编译通过 |
| **P3.1** | `view/` 自定义视图清零 Java | 已完成 | 迁移 17 个自定义 View / Manager（及 `ReactNativeFlipper`），原生层 `.java` 文件清零（共 67 个 `.kt` / 0 个 `.java`） | `find android/app/src -name "*.java"` 为空；Release APK 编译通过（真机转场待手测） |
| **P3.2** | 原生存储引擎替换分片 | 已完成 | SQLite WAL + 文件溢出替换 `AsyncStorage` 分片并实现 `RKStorage`/`AsyncStorage` 双库无损迁移，卸载旧依赖 | 分片重组单元测试与 `lint`/`tsc`/`assembleRelease` 全通过（真机覆盖升级待手测） |
| **P4** | *(远期可选)* 业务下沉 | 待规划 | 播放队列/听歌统计/WebSocket 同步客户端下沉 Kotlin | 杀后台仅剩 Service 时微件/蓝牙可独立切歌 |

---

## 四、分阶段详细执行 Checklist

### 准备阶段：全量代码盘点与建档
- [x] 通读 `v2.3.1`（`b1891e42`）全量源码，盘点 Android 原生层（57 个 Java 文件 / 7,631 行）、`dependencies-patch.js`（28 组补丁）与 JS 桥接契约
- [x] 创建持久化重构追踪清单 `doc/KOTLIN_REFACTOR_PLAN.md`

---

### P0：分支初始化、Gradle Kotlin 现代化与公共底座
- [x] 基于 `b1891e42` 创建并切换到独立工作分支 `refactor/kotlin-native`
- [x] 升级 Gradle Kotlin 与依赖配置（`android/build.gradle` & `android/app/build.gradle`）：
  - [x] 启用 `kotlinx-coroutines-android`（`1.7.3`）
  - [x] 引入 AndroidX Media3 依赖（`media3-exoplayer`、`media3-common`、`media3-database`、`media3-datasource:1.8.0`）与 `androidx.media:media:1.7.0`、`glide:4.15.1`
  - [x] 配置 `compileOptions` / `kotlinOptions { jvmTarget = "17" }`
- [x] 检查并补全 `android/app/proguard-rules.pro` 中的 Kotlin Coroutines、Media3 及模块保留规则
- [x] 新建 `android/app/src/main/java/cn/toside/music/mobile/core/` 公共底座：
  - [x] `ModuleCoroutineScope.kt`（绑定 `ReactApplicationContext` 生命周期，`invalidate()` 自动 cancel，替代散落的 `ExecutorService` / 裸 `Thread`）
  - [x] `ReactBridgeExt.kt`（`Promise` 安全协程封装 `promise.launchCatching { ... }`、`ReadableMap` 类型安全取值与事件发射工具）
- [x] 迁移应用入口类并验证 Java/Kotlin 混编打包：
  - [x] `MainActivity.java` → `MainActivity.kt`
  - [x] `MainApplication.java` → `MainApplication.kt`（已适配 RN 0.73 `override val reactNativeHost` / `isNewArchEnabled` / `isHermesEnabled` 属性覆盖签名）
- [x] **P0 验证**：执行 `npm run lint` 与 `./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`（463 tasks `BUILD SUCCESSFUL`）

---

### P1：原生播放与 DSP 引擎收编（最高价值阶段）

#### P1.1 DSP 音效引擎 Kotlin 化（替代 `audio/` + 注入类）
- [x] 新建 `player/dsp/XmusicDspConfig.kt`（线程安全参数仓库，保持 5 段频点 `[60, 230, 910, 3600, 14000] Hz`、`-1500..1500` mB 增益、低音增强 `0..1000`、响度 `0..1200`）
- [x] 新建 `player/dsp/XmusicDspAudioProcessor.kt`（基于 Media3 `BaseAudioProcessor`，严格使用基本类型数组 `DoubleArray`/`IntArray` 与索引循环实现零 GC 处理 PCM 16/24/32/Float；完整迁移 5 段参量 EQ + 85Hz 低音搁架 + 响度增益 + 0.85 软拐点限幅 + 静音预卷与余弦淡入）
- [x] 合并并升级 `audio/AudioEffectModule.java` + `AudioEffectPackage.java` 为 `player/AudioEffectModule.kt`（纳入 `XmusicPlayerPackage.kt`），保持 `NativeModules.AudioEffectModule` 接口兼容 `src/utils/nativeModules/audioEffect.ts`

#### P1.2 Media3 播放服务与音量包络
- [x] 新建 `player/cache/PlayerMediaCache.kt`：封装 Media3 `SimpleCache`（沿用 `files/TrackPlayer` 目录并增加损坏自愈兜底、字节单位 `getCacheSizeBytes()`、`isCached`、缓存清理，仅对远程 HTTP/HTTPS 启用缓存）
- [x] 新建 `player/XmusicPlayerController.kt`：基于 `ExoPlayer` + `DefaultRenderersFactory` 挂载 `XmusicDspAudioProcessor`；支持音频焦点、AudioOffload、倍速播放、Seek；实现 60fps 柔和启停包络（`softPlayPause`）与曲首/曲末平滑渐变（`crossfadeMs`）及 `AUDIO_SESSION_CHANGED` 广播
- [x] 新建 `player/XmusicPlaybackService.kt`：前台服务生命周期管理、`onTaskRemoved` 彻底清理释放、`ACTION_TOGGLE_FAVORITE` 与微件控制 Action 处理；同步更新 `XmusicWidgetActionReceiver.java` 指向新 Service 类名

#### P1.3 媒体会话、澎湃 OS 超级岛与桌面微件联动
- [x] 新建 `player/session/XmusicMediaNotificationManager.kt` 及自包含通知栏图标（`ic_notif_*.xml`）：
  - [x] 构建兼容 Android 5–15+ 的 `MediaSessionCompat` 与媒体通知
  - [x] 768px 高清封面同步写入 `METADATA_KEY_ALBUM_ART` 与 `METADATA_KEY_ART`（适配 HyperOS 超级岛 / 锁屏），并保持 Target 生命周期避免 Glide 回收位图
  - [x] 通知栏第 5 槽加入红心收藏 Action + `PlaybackStateCompat.CustomAction`（支持免弹窗一键收藏）
  - [x] 支持蓝牙歌词（`updateNowPlayingTitles`、`android.media.metadata.LYRICS`）更新时保留已加载封面位图
  - [x] 同步刷新桌面微件状态与 `widget_cover.png`

#### P1.4 RN Bridge 与 JS 播放器胶水层收敛
- [x] 新建 `player/XmusicPlayerModule.kt`、`player/XmusicPlayerEventBus.kt` 与 `player/XmusicPlayerPackage.kt`（注册至 `MainApplication.kt`）
- [x] 更新 `android/app/src/main/AndroidManifest.xml` 中自研 `XmusicPlaybackService`、`MediaButtonReceiver` 及 `WAKE_LOCK`/`FOREGROUND_SERVICE`/`FOREGROUND_SERVICE_MEDIA_PLAYBACK` 权限
- [x] 适配重构 JS 胶水层与类型声明：
  - [x] `src/types/player.d.ts`、`src/plugins/player/nativePlayer.ts`
  - [x] `src/plugins/player/index.ts`
  - [x] `src/plugins/player/utils.ts`
  - [x] `src/plugins/player/playList.ts`
  - [x] `src/plugins/player/service.ts`
  - [x] `src/plugins/player/hook.ts`
  - [x] `src/utils/nativeModules/audioEffect.ts`
- [x] **架构简化专项**：
  - [x] 使用原生 `playback-track-ended` 事件淘汰 `defaultUrl`（11025Hz 空白音轨哨兵）双轨 Hack 及 `<20kHz` 静音补丁
  - [x] 用原生单次 `getPlaybackSnapshot()` 替代 `hook.ts` 每次轮询 3 次独立 Bridge Promise 调用

#### P1.5 依赖与补丁清理
- [x] 从 `package.json` / `package-lock.json` 卸载移除 `react-native-track-player`
- [x] 清理 `dependencies-patch.js` 中全部 21 处播放器补丁与注入源码字符串，仅保留 `react-native-navigation` 的 23 条补丁片段（7 组规则）并实测通过
- [x] 删除旧 `audio/AudioEffectModule.java` 与 `AudioEffectPackage.java`

#### P1 构建与代码验证（真机交互留待装包手测）
- [x] 全量 `npm run lint`、`npx tsc --noEmit` 与 `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`（含 R8/ProGuard 混淆与 `lintVitalRelease`）全部通过，产出 `xmusic-v2.3.1-arm64-v8a.apk` 与 `xmusic-v2.3.1-universal.apk`
- [x] 云端双版本（Redroid Android 14 / 15 `arm64-v8a`）实测通过：本地音频 `VIEW` 启动与连续等长切歌、`MediaSession` 状态同步与 5 槽位通知栏（含收藏按钮）、`On · Mega Bass` 均衡器界面与 30 秒完整播放、`XmusicPlaybackService` 微件控制（播放/暂停与红心联动）、`CacheModule` 缓存读取与清理（`3.35 MiB` -> `196.00 KiB`）
- [x] 真机验证（小米 24031PN0DC / Android 16 / HyperOS 3.0）：在线流媒体解析播放与 Seek、小米 HyperOS 超级岛胶囊封面与波形、通知栏红心免弹窗收藏、媒体键控制、划掉多任务后台完全释放与 `47.44 MiB` 缓存清理通过
- [ ] 真机主观与桌面交互回归：耳机听感/防爆音实测与桌面长按添加微件实测

---

### P2：存量原生业务模块治理与全面 Kotlin 化

#### P2.1 工具型小模块先行（`crypto/` + `cache/`，共 8 个文件）
- [x] `crypto/` 模块迁移（4 个文件 → Kotlin）：
  - [x] `AES.java` → `AES.kt`（100% 对齐 `Base64.DEFAULT`/`NO_WRAP`、IV 16 字节截断与零填充逻辑）
  - [x] `RSA.java` → `RSA.kt`（对齐 X509/PKCS8 与 `Base64.NO_WRAP`）
  - [x] `CryptoModule.java` → `CryptoModule.kt`（异步 `generateRsaKey` 使用 `ModuleCoroutineScope` `Dispatchers.Default`，保留 Sync/Async 与 `sha1`）
  - [x] `CryptoPackage.java` → `CryptoPackage.kt`
  - [x] 真机实测校验（HyperOS 3.0）：对齐 `cryptoTest.ts` 算法参数与 Node `crypto` 基准，实测 AES CBC/ECB、短 IV 零填充、Sync/Async、SHA1（含 UTF-8 中文）、RSA NoPadding/OAEP 交叉解密与 `generateRsaKey` 往返共 16/16 全部通过
- [x] `cache/` 模块迁移（4 个文件 → Kotlin）：
  - [x] `CacheModule.java`、`CachePackage.java`、`Utils.java` 迁为 `CacheModule.kt`、`CachePackage.kt`、`CacheUtils.kt`，用 `ModuleCoroutineScope(Dispatchers.IO)` 替换 `CacheClearAsyncTask.java`
  - [x] 删除 `cache/CacheClearAsyncTask.java` 与废弃的 `utils/AsyncTask.java`

#### P2.2 自定义源沙箱 `userApi/` 协程单线程化（8 个文件）
- [x] 设计并实现 `userApi/QuickJsEngine.kt`：使用 `Executors.newSingleThreadExecutor().asCoroutineDispatcher()` 保证 `QuickJSContext` 严格单线程亲和性
- [x] 迁移 `UserApiModule.java` → `UserApiModule.kt`、`UserApiPackage.java` → `UserApiPackage.kt`、`Console.java` → `QuickJsConsole.kt`
- [x] 移除 `JavaScriptThread.java`、`JsHandler.java`、`HandlerWhat.java`、`UtilsEvent.java`（事件发射收敛至 `ReactBridgeExt.kt`）
- [x] 用协程 `scope.launch { delay(...) }` 替换 `Handler` 定时器彻底消除销毁后泄漏，并用预分配 `StringBuilder` 优化 `utils_b642buf` 序列化
- [x] 云端验收（Android 14）：本地文件选择器导入 `xmusic_quickjs_test.js`、`[Successfully initialized]` 状态展示、`md5` 摘要计算与 `setTimeout` 异步回调执行、冷重启自动恢复初始化
- [ ] 真机/联网验收：真实在线自定义源解析播放、请求取消与频繁切换源压力实测

#### P2.3 拆分 1,138 行 `UtilsModule` + `widget/` 迁移 + 统一封面管线（11 个文件）
- [x] 新建统一封面管线（复用 Glide 内存/磁盘缓存消灭切歌三连请求）：
  - [x] `artwork/CoverArtworkRepository.kt`（Glide 优先加载 + 失败流回退 + LRU 40 条 `paletteCache`）
  - [x] `artwork/CoverPaletteExtractor.kt`（24 色相桶 HSL 主色/辅色提取纯 Kotlin 化）
- [x] 迁移 `widget/` 下 4 个文件为 Kotlin：
  - [x] `XmusicCapsuleWidgetProvider.kt`
  - [x] `XmusicCardWidgetProvider.kt`
  - [x] `XmusicWidgetActionReceiver.kt`
  - [x] `XmusicWidgetUpdater.kt`
- [x] 拆分 `UtilsModule.java`（对外保持 `getName() == "UtilsModule"`，并用协程 `Mutex` 保护 `widget_cover.png` 原子写入）：
  - [x] `utils/PosterShareHelper.kt`（歌词海报视图截屏、缓存清理、`FileProvider` 分享、`MediaStore` 保存相册）
  - [x] `utils/SystemUiHelper.kt`（安全区 Insets、导航栏高度、窗口尺寸、屏幕常亮、`DisplayListener`、`screen-state`、线性马达触感）
  - [x] `utils/DevicePermissionHelper.kt`、`BatteryOptimizationUtil.kt`、`NotificationPermissionUtil.kt`
  - [x] `utils/UtilsModule.kt` + `utils/UtilsPackage.kt`
- [x] 云端验收（Android 14 / 15）：封面主题色、动态流光背景与 `XmusicPlaybackService` 微件控播/收藏联动状态同步正常
- [ ] 真机验收：系统桌面添加小组件实例、歌词海报分享/存图、物理屏幕旋转安全区适配实测

#### P2.4 桌面悬浮歌词模块 `lyric/` 迁移（9 个文件）
- [x] 迁移核心解析与调度：`LyricPlayer.kt`（用强类型 `LyricLine` 替换原始 `HashMap`，收敛 `Handler` 调度与倍速同步）
- [x] 迁移自定义悬浮窗视图：`LyricView.kt`、`LyricTextView.kt`、`LyricSwitchView.kt`
- [x] 迁移控制与桥接层：`Lyric.kt`、`LyricModule.kt`（补齐 `setPosition` 方法）、`LyricPackage.kt`
- [x] 云端验收（Android 14）：授予 `SYSTEM_ALERT_WINDOW` 权限后开启悬浮桌面歌词，`TYPE_APPLICATION_OVERLAY` 透明悬浮窗正常挂载无崩溃
- [x] 真机部分验收（HyperOS 3.0）：桌面歌词显示、锁定穿透（`FLAG_NOT_TOUCHABLE` 切换）与后台拖拽位置持久化（含冷重启精准恢复）已实测通过
- [ ] 真机排版验收：单双行切换与翻译/罗马音排版手测

- [x] **P2 阶段编译验证**：`npm run lint`、`npx tsc --noEmit` 与 `./gradlew assembleDebug`（435 tasks `BUILD SUCCESSFUL`）全部通过；剩余 `.java` 仅剩 `view/` 下 17 个文件（及 `release/java/.../ReactNativeFlipper.java`）

---

### P3：原生自定义 View 清零 & 原生高性能存储引擎

#### P3.1 `view/` 包 17 个文件迁为 Kotlin（原生 `.java` 文件彻底清零）
- [x] `XmusicViewPackage.java` → `XmusicViewPackage.kt`
- [x] `WavyProgressView.java` + `WavyProgressViewManager.java` → `.kt`
- [x] `FluidBgView.java` + `FluidBgViewManager.java` → `.kt`
- [x] `FadeImageView.java` + `FadeImageViewManager.java` → `.kt`（完整保留继承 `ReactImageView`、`OverlayLayout` `layout()` 坐标钉住及 650ms 飞行渐变逻辑）
- [x] `EdgeSwipeView.java` + `EdgeSwipeViewManager.java` → `.kt`
- [x] `EdgeToEdgeModalView.java` + `EdgeToEdgeModalViewManager.java` → `.kt`
- [x] `AlphaFadeView.java` + `AlphaFadeViewManager.java` → `.kt`
- [x] `LinearGradientView.java` + `LinearGradientViewManager.java` → `.kt`
- [x] `SolidHeartView.java` + `SolidHeartViewManager.java` → `.kt`
- [x] `release/java/cn/toside/music/ReactNativeFlipper.java` → `release/java/cn/toside/music/mobile/ReactNativeFlipper.kt`
- [x] **里程碑检查**：`find android/app/src -name "*.java"` 输出 **0** 个文件（现有 67 个 `.kt` 文件）；`testDebugUnitTest`（4/4 passed）与 `assembleRelease`（766 tasks `BUILD SUCCESSFUL`，产出 11MB `arm64-v8a` & `universal` APK）通过
- [x] 云端 UI 渲染回归（Android 14 / 15）：`WavyProgressView`、`FluidBgView`、`FadeImageView` 与 `SolidHeartView` 渲染与动态变化正常
- [x] 真机转场回归（HyperOS 3.0）：`playDetail_pic` 共享元素转场与 `WavyProgressView` 波形进度条实测通过
- [ ] 真机主观流畅度回归：120Hz 高刷屏幕流体背景与动画手感实测

#### P3.2 原生存储引擎替换 `AsyncStorage` 分片逻辑
- [x] 设计并实现 `storage/XmusicStorageEngine.kt`、`XmusicStorageModule.kt` 与 `XmusicStoragePackage.kt`（基于 SQLite WAL + 256K 字符阈值原子文件溢出存储，免除 `CursorWindow` 2MB 限制）
- [x] 实现**首次启动无损自动迁移**：自动扫描旧 `RKStorage`（`catalystLocalStorage`）与 Room `AsyncStorage`（`Storage`）数据库，使用分段 `SUBSTR` 安全读取超大条目并自动重组 `@___PART___` 与 `@___PART_A___` 分片键
- [x] 对接升级 `src/plugins/storage.ts`（保持 `saveData` / `getData` / `removeData` / `getDataMultiple` / `saveDataMultiple` / `removeDataMultiple` / `getAllKeys` / `clearAll` 契约兼容）
- [x] 卸载 `@react-native-async-storage/async-storage` 依赖并清理 `android/gradle.properties` 中的旧 `AsyncStorage_*` 配置
- [x] 添加 Kotlin JUnit4 单元测试 `XmusicCoreUnitTest.kt`（4/4 passed，覆盖 `XmusicDspConfig`、`LyricPlayer` 厘秒/毫秒解析及 `XmusicStorageEngine.reassembleLegacyEntries` 分片重组）
- [x] 云端覆盖安装验收（Android 14 / 15）：`v2.3.0 (85003)` 原地覆盖安装 `v2.3.1` 后无损迁移旧 `AsyncStorage`（`Migrated 8 / 9 entries`），冷重启后主题、均衡器预设与自定义源状态完整保留
- [ ] 真机大歌单性能手测：数千首歌曲歌单写入、列表滚动与频繁切歌压力测试

---

### P4（远期可选）：核心业务状态机下沉（脱离 JS 线程后台控播）
- [ ] 评估并将播放队列状态机（`src/core/player/`）与本地听歌统计（`src/core/listeningStats.ts`）下沉至 Kotlin Service + Room/SQLite，实现杀掉 UI 仅留媒体服务时桌面微件/蓝牙直接独立切歌
- [ ] 评估并将跨设备增量同步客户端（`src/plugins/sync/`）迁为 Kotlin `OkHttp WebSocket` + Coroutines

---

## 五、困难与问题追踪记录（Issues & Blockers Log）

> 记录重构过程中实际遭遇的难点、编译坑、行为差异或潜在风险。**已解决的条目请保留原文并加 `~~删除线~~`，不要直接删行。**

### 当前已知风险与待排雷项（代码预审阶段识别）
- [x] ~~`[P1-缓存兼容]` 旧版 `react-native-track-player` 在私有存储 `files/TrackPlayer` 下生成的缓存目录与自研 Media3 `SimpleCache` 的索引结构可能存在差异，需在 `PlayerMediaCache.kt` 中做好旧缓存兼容清理或平滑过渡，避免占满空间或读取异常。~~（解决方案：`PlayerMediaCache.kt` 沿用同版本 Media3 1.8.0 与 `files/TrackPlayer` 目录并增加 `try/catch` 损坏目录重置自愈兜底，同时仅对远程 HTTP/HTTPS 启用缓存，本地文件直通 `DefaultDataSource`）
- [x] ~~`[P1-音频实时性]` 将 `XmusicDspAudioProcessor` 从 Java 迁往 Kotlin 时，`queueInput` 音频帧循环中严禁使用高阶函数闭包、`Pair` 解构、装箱 `Double`/`Int` 或可空类型包装，必须坚持原生 `DoubleArray`/`IntArray` 与 `for` 索引循环，避免 AudioThread GC 抖动引发爆音。~~（解决方案：`XmusicDspAudioProcessor.kt` 全部使用 `DoubleArray`/`IntArray`/`BooleanArray`/`Array(NUM_STAGES) { DoubleArray(MAX_CHANNELS) }` 与 `for (f in 0 until frames)` 索引循环，零装箱零闭包；同时淘汰 `defaultUrl` 11025Hz 占位音轨后移除了 `<20kHz` 静音 Hack）
- [x] ~~`[P2.1-加解密字节级一致]` `AES.kt` 与 `RSA.kt` 的 Cipher Transformation、Padding、IV 拼接顺序、字符编码及 `Base64.NO_WRAP` 处理必须与原 Java 代码 100% 字节级对齐，防止多端同步握手或自定义源鉴权失效（必须通过 `cryptoTest.ts`）。~~（解决方案：`AES.kt` 与 `RSA.kt` 严格保持原 Java 版 `Base64.DEFAULT` 解码、`Base64.NO_WRAP` 输出、空 IV 无 `IvParameterSpec` 分支、16 字节 IV 数组截断填充及异常返回 `""` 语义）
- [x] ~~`[P2.2-QuickJS线程亲和性]` `wang.harlon.quickjs:wrapper-android:2.4.0` 的 `QuickJSContext` 绑定创建线程（JNI 线程局部检查），`create`、`evaluate`、`call`、`setTimeout` 回调与 `destroy` 必须全部严格调度在同一个单线程 `ExecutorCoroutineDispatcher` 上，切勿使用多线程池 `Dispatchers.Default`/`IO`。~~（解决方案：`QuickJsEngine.kt` 独占 `Executors.newSingleThreadExecutor().asCoroutineDispatcher()` 与独立 `SupervisorJob` 作用域，将创建、求值、桥接调用、`delay` 定时回调与 `destroy()` 全部封闭于单线程上下文并在销毁时自动取消所有挂起协程）
- [x] ~~`[P3.1-共享元素转场]` `FadeImageView` 参与 `react-native-navigation` 播放页 `playDetail_pic` 的共享元素动画，迁移为 Kotlin 时必须完整保留其视图层级、缩放类型及 `onLayout` 时机，不可随意改写为异步加载占位导致 `ExistingViewFinder` 判定失败。~~（解决方案：`FadeImageView.kt` 原样继承 `ReactImageView`，完整保留 `OverlayLayout` 下的 `layout()` 坐标锁与 650ms 飞行渐变裁剪逻辑；`FadeImageViewManager.kt` 保留 `@ReactModule` 与全部 `@ReactProp`）

### 已解决记录示例（后续真实解决条目紧随其后追加）
- [x] ~~`[示例]` 某个模块在 Kotlin 迁移后出现空指针或编译告警~~（解决方案：记录具体根因、修改文件与提交说明）
- [x] ~~`[P0-构建环境]` 当前宿主机为 ARM64 (`aarch64`) Linux，而 Android SDK `aapt2`、RN `hermesc` 与 NDK `clang` 为 `x86_64` 二进制；同时环境仅装有 JRE（缺 `jlink`）且无正式 `android/keystore.properties`~~（解决方案：安装 `qemu-user`、`qemu-user-binfmt`、`libc6-amd64-cross`、`libstdc++6-amd64-cross`、`libgcc-s1-amd64-cross`、`openjdk-17-jdk`，并向 `/usr/x86_64-linux-gnu/lib/` 补入 `zlib1g` amd64 的 `libz.so.1`；后续运行 Gradle 统一携带 `QEMU_LD_PREFIX=/usr/x86_64-linux-gnu` 与 `-PMYAPP_UPLOAD_STORE_FILE=debug.keystore -PMYAPP_UPLOAD_STORE_PASSWORD=android -PMYAPP_UPLOAD_KEY_ALIAS=androiddebugkey -PMYAPP_UPLOAD_KEY_PASSWORD=android`）
- [x] ~~`[P0-MainApplication]` `NavigationApplication`（实现 Kotlin 接口 `ReactApplication`）与 `DefaultReactNativeHost` 在 RN 0.73 下要求使用 Kotlin 属性 `override val reactNativeHost` / `isNewArchEnabled` / `isHermesEnabled` 而非 Java getter 方法~~（解决方案：将 `MainApplication.kt` 中的 `getReactNativeHost()` 及方法式覆写改为 Kotlin 属性覆写）
- [x] ~~`[P1-Hermes与ServiceCompat]` RN Gradle 插件在 `aarch64` Linux 上报错 `OS not recognized`；此外 `ServiceCompat.startForeground` 4 参数重载在当前传递 `core` 版本中未解析~~（解决方案：在 `android/app/build.gradle` 为 `aarch64` Linux 添加 `linux64-bin/hermesc` 条件回退；在 `XmusicPlaybackService.kt` 与 `XmusicMediaNotificationManager.kt` 改用标准 `Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q` 分支直接调用 `Service.startForeground` / `stopForeground`）
- [x] ~~`[P3-单测与ESLint]` 纯 JVM 单测中 `LyricPlayer` 初始化 `Handler(Looper.getMainLooper())` 抛出 `Looper not mocked`；Gradle 生成的 `android/app/build/reports/tests/.../report.js` 触发项目 ESLint 扫描报错；`ReactContext.emitDeviceEvent` 扩展被 RN 0.73 内置成员方法遮蔽~~（解决方案：`LyricPlayer.kt` 的 `timeoutHandler` 改为 `by lazy` 延迟初始化，在 `.eslintrc.cjs` 的 `ignorePatterns` 添加 `'android/**/build'`，并将 `ReactBridgeExt.kt` 安全事件扩展重命名为 `sendJsEvent`）
- [x] ~~`[云端验证-切歌元数据]` 连续切换两首时长相同的音频（同为 30s）且上一首自然播完后，`src/plugins/player/playList.ts` 中 `state.isPlaying` 未复位且未比较 `trackId`，导致 `updateMetaData` 判定 `isPlay == state.isPlaying && prevDuration == duration` 并跳过 `delayUpdateMusicInfo`，使 `MediaSession` 标题停留在上一曲~~（解决方案：在 `playList.ts` 新增 `state.prevTrackId`，并在 `initTrackInfo` 与 `handlePlayMusic` 加载新音轨时重置 `isPlaying = false`、`prevDuration = -1`、`prevTrackId = ''`，已于 Redroid Android 14 / 15 重打包覆写验证连续等长音轨切换正常刷新）
- [x] ~~`[真机验证-后台JS定时器冻结]` 卸载 `react-native-track-player` 并移除播放期 Headless JS 任务后，RN `JavaTimerManager` 在应用退至后台（`onHostPause`）时停止推进标准 `setTimeout`/`throttle`，导致后台拖拽桌面歌词位置未保存（切回前台才写入）、后台听歌统计节流落盘挂起及后台 `delayRetry` 无法触发~~（解决方案：未采用会在后台以 120Hz 唤醒 Choreographer 且暂停态失效的常驻 Headless 任务，改为将后台可达模块的普通定时器与节流统一替换为 `react-native-background-timer` / `throttleBackgroundTimer`，涉及 `src/core/common.ts`、`src/core/listeningStats.ts`、`src/core/player/player.ts`、`src/core/init/player/playerEvent.ts`、`src/core/lyric.ts`、`src/utils/data.ts` 与 `src/plugins/sync/client/client.ts`；已在 HyperOS 3.0 真机验证暂停态后台拖拽桌面歌词立即写入 `xmusic_kv.db` 且冷重启精准恢复、后台听歌统计秒数持续落盘及切歌元数据刷新）
