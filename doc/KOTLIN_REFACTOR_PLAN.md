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
| **P1** | 原生播放与 DSP 引擎收编 | 待开始 | 自研 Kotlin Media3 播放服务与 64-bit 内部/32-bit 浮点 DSP，移除 `react-native-track-player` 与 21 处补丁 | 播/停/Seek/淡入淡出/EQ/超级岛/微件/缓存全通 |
| **P2.1** | `crypto/` + `cache/` 迁移 | 待开始 | 迁出加解密与缓存清理模块，淘汰废弃 `AsyncTask` | `cryptoTest.ts` 自检通过 + 缓存统计/清理正常 |
| **P2.2** | `userApi/` 沙箱重构 | 待开始 | 用单线程协程调度器重写 `QuickJsEngine.kt`，淘汰裸 `Handler`/`Thread` | 自定义源加载/解析/超时/销毁无泄漏与崩溃 |
| **P2.3** | `UtilsModule` 拆分 + `widget/` | 待开始 | 拆分 1,138 行上帝类，建立统一封面管线消灭三连请求，迁移桌面微件 | 主题取色、微件双向同步、海报分享/存图、权限检测全通 |
| **P2.4** | `lyric/` 悬浮歌词迁移 | 待开始 | 迁移 9 个悬浮歌词类，收敛 `WindowManager` 生命周期与倍速同步 | 悬浮窗显示/锁定/拖拽/卡拉OK/倍速对齐正常 |
| **P3.1** | `view/` 自定义视图清零 Java | 待开始 | 迁移 17 个自定义 View / Manager，原生层 Java 文件彻底清零 | `find android/app/src -name "*.java"` 输出为空；共享元素转场正常 |
| **P3.2** | 原生存储引擎替换分片 | 待开始 | 用 SQLite WAL + 溢出存储替换 `AsyncStorage` 500KB 分片逻辑并无损迁移历史数据 | 升级安装后旧歌单/设置/听歌统计 100% 无损读取 |
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
- [ ] 新建 `player/dsp/XmusicDspConfig.kt`（线程安全参数仓库，保持 5 段频点 `[60, 230, 910, 3600, 14000] Hz`、`-1500..1500` mB 增益、低音增强 `0..1000`、响度 `0..1200`）
- [ ] 新建 `player/dsp/XmusicDspAudioProcessor.kt`（基于 Media3 `BaseAudioProcessor`，严格使用基本类型数组 `DoubleArray`/`IntArray` 零 GC 处理 PCM 16/24/32/Float；完整迁移 5 段参量 EQ + 85Hz 低音搁架 + 响度增益 + 0.85 软拐点限幅 + 静音预卷与余弦淡入）
- [ ] 合并并升级 `audio/AudioEffectModule.java` + `AudioEffectPackage.java` 为 Kotlin（或纳入 `XmusicPlayerPackage.kt`），保持 `NativeModules.AudioEffectModule` 接口兼容 `src/utils/nativeModules/audioEffect.ts`

#### P1.2 Media3 播放服务与音量包络
- [ ] 新建 `player/cache/PlayerMediaCache.kt`：封装 Media3 `SimpleCache`（目录、容量上限、缓存命中判断 `isCached`、缓存统计与清理，兼顾旧版 `TrackPlayer` 缓存迁移/清理）
- [ ] 新建 `player/XmusicPlayerController.kt`：基于 `ExoPlayer` + `DefaultRenderersFactory` 挂载 `XmusicDspAudioProcessor`；支持音频焦点管理、AudioOffload 开关、倍速播放、Seek；实现 60fps 柔和启停包络（`softPlayPause`）与曲首/曲末平滑渐变（`crossfadeMs`）及音频会话广播
- [ ] 新建 `player/XmusicPlaybackService.kt`：前台服务生命周期管理、`onTaskRemoved` 彻底清理释放、`ACTION_TOGGLE_FAVORITE` 与微件控制 Action 处理

#### P1.3 媒体会话、澎湃 OS 超级岛与桌面微件联动
- [ ] 新建 `player/session/XmusicMediaNotificationManager.kt`：
  - [ ] 构建兼容 Android 5–15+ 的 `MediaSessionCompat` / Media3 Session 与媒体通知
  - [ ] 768px 高清封面同步写入 `METADATA_KEY_ALBUM_ART` 与 `METADATA_KEY_ART`（适配 HyperOS 超级岛 / 锁屏），并保持 Target 生命周期避免 Glide 回收位图
  - [ ] 通知栏第 5 槽加入红心收藏 Action + `PlaybackStateCompat.CustomAction`（支持免弹窗一键收藏）
  - [ ] 支持蓝牙歌词（`updateNowPlayingTitles`）更新时保留已加载封面位图
  - [ ] 与后续统一封面管线对齐，同步刷新桌面微件状态与 `widget_cover.png`

#### P1.4 RN Bridge 与 JS 播放器胶水层收敛
- [ ] 新建 `player/XmusicPlayerModule.kt` 与 `player/XmusicPlayerPackage.kt`（注册至 `MainApplication.kt`）
- [ ] 更新 `android/app/src/main/AndroidManifest.xml` 中自研 `XmusicPlaybackService` 声明与前台服务权限（兼容 Android 14+ `FOREGROUND_SERVICE_MEDIA_PLAYBACK` 如调整 targetSdk 时备用）
- [ ] 适配重构 JS 胶水层：
  - [ ] `src/plugins/player/index.ts`
  - [ ] `src/plugins/player/utils.ts`
  - [ ] `src/plugins/player/playList.ts`
  - [ ] `src/plugins/player/service.ts`
  - [ ] `src/plugins/player/hook.ts`
  - [ ] `src/utils/nativeModules/audioEffect.ts`
- [ ] **架构简化专项**：
  - [ ] 使用原生真实的 `playback-ended` 回调淘汰 `defaultUrl`（11025Hz 空白音轨哨兵）双轨 Hack 及 `<20kHz` 静音补丁
  - [ ] 用原生单次 `getPlaybackSnapshot()` 或原生节流推送替代 `hook.ts` 每秒 3 次独立 Bridge Promise 轮询

#### P1.5 依赖与补丁清理
- [ ] 从 `package.json` 卸载移除 `react-native-track-player`（及更新 `package-lock.json`）
- [ ] 清理 `dependencies-patch.js` 中全部 21 处播放器补丁与注入源码字符串（`dspConfigSource` / `dspProcessorSource`），仅保留 `react-native-navigation` 的 7 组补丁（规则 #17、#18、#23、#25、#26、#27、#28）
- [ ] 删除旧 `audio/AudioEffectModule.java` 与 `AudioEffectPackage.java`

#### P1 验收清单
- [ ] 在线切歌、本地音频播放、后台息屏连播、Seek 拖拽与倍速播放正常
- [ ] 柔和启停与曲末淡出无爆音；开启 5 段均衡器 + 低音增强 + 响度增益实时生效
- [ ] 锁屏控件、通知栏、HyperOS 超级岛封面与第 5 槽红心收藏同步正常
- [ ] 桌面大小微件（胶囊/卡片）切歌、播放/暂停、收藏联动正常
- [ ] 边播边存缓存体积统计与一键清缓存正常
- [ ] 划掉后台多任务卡片可正常退出释放服务无僵尸通知

---

### P2：存量原生业务模块治理与全面 Kotlin 化

#### P2.1 工具型小模块先行（`crypto/` + `cache/`，共 8 个文件）
- [ ] `crypto/` 模块迁移（4 个文件 → Kotlin）：
  - [ ] `AES.java` → `AES.kt`
  - [ ] `RSA.java` → `RSA.kt`
  - [ ] `CryptoModule.java` → `CryptoModule.kt`
  - [ ] `CryptoPackage.java` → `CryptoPackage.kt`
  - [ ] 跑通 `src/utils/nativeModules/cryptoTest.ts` 全部加解密一致性自检
- [ ] `cache/` 模块迁移（4 个文件 → Kotlin）：
  - [ ] `CacheModule.java`、`CachePackage.java`、`Utils.java` 迁为 Kotlin，用 `Dispatchers.IO` 协程替换 `CacheClearAsyncTask.java`
  - [ ] 删除 `cache/CacheClearAsyncTask.java` 与废弃的 `utils/AsyncTask.java`

#### P2.2 自定义源沙箱 `userApi/` 协程单线程化（8 个文件）
- [ ] 设计并实现 `userApi/QuickJsEngine.kt`：使用 `Executors.newSingleThreadExecutor().asCoroutineDispatcher()` 保证 `QuickJSContext` 严格单线程亲和性
- [ ] 迁移 `UserApiModule.java` → `UserApiModule.kt`、`UserApiPackage.java` → `UserApiPackage.kt`、`Console.java` → `QuickJsConsole.kt`
- [ ] 移除 `JavaScriptThread.java`、`JsHandler.java`、`HandlerWhat.java`、`UtilsEvent.java`（事件发射收敛至 `ReactBridgeExt.kt`）
- [ ] 修复原 `timeoutHandler` 在脚本重载/销毁后潜在的定时器泄漏问题，并优化 `utils_b642buf` 字节数组构建效率
- [ ] 验收：导入/切换自定义源脚本、在线解析播放、请求取消、超时回调与频繁切换源无崩溃或内存泄漏

#### P2.3 拆分 1,138 行 `UtilsModule` + `widget/` 迁移 + 统一封面管线（11 个文件）
- [ ] 新建统一封面管线（消灭切歌时 Glide + `extractCoverPalette` + `updateWidgetState` 重复拉取 3 次封面的问题）：
  - [ ] `artwork/CoverArtworkRepository.kt`（基于 OkHttp + 内存 LRU + 磁盘缓存的单飞请求仓库，一次拉取共享供给播放通知、动态取色与桌面微件）
  - [ ] `artwork/CoverPaletteExtractor.kt`（将 `UtilsModule` 中 24 色相桶 HSL 主色/辅色提取算法纯 Kotlin 化）
- [ ] 迁移 `widget/` 下 4 个文件为 Kotlin，并用协程 `Mutex` 保护 `widget_cover.png` 原子写入与缓存淘汰：
  - [ ] `XmusicCapsuleWidgetProvider.kt`
  - [ ] `XmusicCardWidgetProvider.kt`
  - [ ] `XmusicWidgetActionReceiver.kt`
  - [ ] `XmusicWidgetUpdater.kt`
- [ ] 拆分 `UtilsModule.java`（对外继续保持 `getName() == "UtilsModule"`，确保 `src/utils/nativeModules/utils.ts` 零改动）：
  - [ ] `utils/PosterShareHelper.kt`（歌词海报视图截屏、临时目录清理、`FileProvider` 分享、`MediaStore` 保存相册）
  - [ ] `utils/SystemUiHelper.kt`（安全区 Insets、导航栏高度、窗口尺寸、屏幕常亮、`DisplayListener` 旋转监听、屏幕开关广播、线性马达震动反馈）
  - [ ] `utils/DevicePermissionHelper.kt` / `BatteryOptimizationUtil.kt` / `NotificationPermissionUtil.kt`（APK 安装、WiFi IPv4、设备名、系统语言、电池优化与通知权限跳转）
  - [ ] `utils/UtilsModule.kt` + `utils/UtilsPackage.kt`（薄门面委托调用上述 Helper 与 `CoverArtworkRepository`）
- [ ] 验收：封面动态主题实时流转、长按歌词海报分享/保存相册、横竖屏旋转/安全区、触感反馈、权限检测、桌面微件全部正常

#### P2.4 桌面悬浮歌词模块 `lyric/` 迁移（9 个文件）
- [ ] 迁移工具与数据结构：`LyricEvent.kt` / `LyricUtils.kt` / `LyricPlayer.kt`（替代原有手写状态机定时器，梳理倍速播放时间戳精度）
- [ ] 迁移自定义悬浮窗视图：`LyricView.kt`、`LyricTextView.kt`、`LyricSwitchView.kt`
- [ ] 迁移控制与桥接层：`Lyric.kt`、`LyricModule.kt`、`LyricPackage.kt`（保持 `src/utils/nativeModules/lyricDesktop.ts` 零改动）
- [ ] 验收：开启/关闭桌面歌词、单双行切换、锁定穿透、位置拖拽记忆、歌词字体/透明度/颜色调整、翻译与罗马音切换正常

---

### P3：原生自定义 View 清零 & 原生高性能存储引擎

#### P3.1 `view/` 包 17 个文件迁为 Kotlin（原生 `.java` 文件彻底清零）
- [ ] `XmusicViewPackage.java` → `XmusicViewPackage.kt`
- [ ] `WavyProgressView.java` + `WavyProgressViewManager.java` → `.kt`（重点验证波浪动画帧率与暂停/拖拽插值）
- [ ] `FluidBgView.java` + `FluidBgViewManager.java` → `.kt`（验证 120Hz 微抖动流体网格背景性能）
- [ ] `FadeImageView.java` + `FadeImageViewManager.java` → `.kt`（**重点验证 `playDetail_pic` 共享元素过渡**）
- [ ] `EdgeSwipeView.java` + `EdgeSwipeViewManager.java` → `.kt`
- [ ] `EdgeToEdgeModalView.java` + `EdgeToEdgeModalViewManager.java` → `.kt`
- [ ] `AlphaFadeView.java` + `AlphaFadeViewManager.java` → `.kt`
- [ ] `LinearGradientView.java` + `LinearGradientViewManager.java` → `.kt`
- [ ] `SolidHeartView.java` + `SolidHeartViewManager.java` → `.kt`
- [ ] **里程碑检查**：执行 `find android/app/src -name "*.java"` 输出为空；全量编译 Release APK 与真机 UI/转场回归通过

#### P3.2 原生存储引擎替换 `AsyncStorage` 分片逻辑
- [ ] 设计 `storage/XmusicStorageModule.kt`（底层基于 Android 原生 SQLite WAL 模式 + 超大 Value 独立文件/BLOB 存储，免除 `CursorWindow` 2MB 限制）
- [ ] 实现**首次启动无损自动迁移**：自动扫描旧 `RKStorage` 数据库，识别并合并 `@___PART___` 与 `@___PART_A___` 分片键，迁移成功后标记完成且保留容灾兜底
- [ ] 对接升级 `src/plugins/storage.ts`（`saveData` / `getData` / `removeData` / `getDataMultiple` / `saveDataMultiple` / `removeDataMultiple` / `getAllKeys` / `clearAll`）
- [ ] 评估是否可安全移除 `@react-native-async-storage/async-storage` 依赖（确认第三方库无隐式依赖后清理）
- [ ] 验收：老版本覆盖安装后本地歌单、设置项、听歌足迹与历史播放记录 100% 完整保留，大歌单（>5,000 首）加载无明显 JS 主线程卡顿

---

### P4（远期可选）：核心业务状态机下沉（脱离 JS 线程后台控播）
- [ ] 评估并将播放队列状态机（`src/core/player/`）与本地听歌统计（`src/core/listeningStats.ts`）下沉至 Kotlin Service + Room/SQLite，实现杀掉 UI 仅留媒体服务时桌面微件/蓝牙直接独立切歌
- [ ] 评估并将跨设备增量同步客户端（`src/plugins/sync/`）迁为 Kotlin `OkHttp WebSocket` + Coroutines

---

## 五、困难与问题追踪记录（Issues & Blockers Log）

> 记录重构过程中实际遭遇的难点、编译坑、行为差异或潜在风险。**已解决的条目请保留原文并加 `~~删除线~~`，不要直接删行。**

### 当前已知风险与待排雷项（代码预审阶段识别）
- [ ] `[P1-缓存兼容]` 旧版 `react-native-track-player` 在私有存储 `files/TrackPlayer` 下生成的缓存目录与自研 Media3 `SimpleCache` 的索引结构可能存在差异，需在 `PlayerMediaCache.kt` 中做好旧缓存兼容清理或平滑过渡，避免占满空间或读取异常。
- [ ] `[P1-音频实时性]` 将 `XmusicDspAudioProcessor` 从 Java 迁往 Kotlin 时，`queueInput` 音频帧循环中严禁使用高阶函数闭包、`Pair` 解构、装箱 `Double`/`Int` 或可空类型包装，必须坚持原生 `DoubleArray`/`IntArray` 与 `for` 索引循环，避免 AudioThread GC 抖动引发爆音。
- [ ] `[P2.1-加解密字节级一致]` `AES.kt` 与 `RSA.kt` 的 Cipher Transformation、Padding、IV 拼接顺序、字符编码及 `Base64.NO_WRAP` 处理必须与原 Java 代码 100% 字节级对齐，防止多端同步握手或自定义源鉴权失效（必须通过 `cryptoTest.ts`）。
- [ ] `[P2.2-QuickJS线程亲和性]` `wang.harlon.quickjs:wrapper-android:2.4.0` 的 `QuickJSContext` 绑定创建线程（JNI 线程局部检查），`create`、`evaluate`、`call`、`setTimeout` 回调与 `destroy` 必须全部严格调度在同一个单线程 `ExecutorCoroutineDispatcher` 上，切勿使用多线程池 `Dispatchers.Default`/`IO`。
- [ ] `[P3.1-共享元素转场]` `FadeImageView` 参与 `react-native-navigation` 播放页 `playDetail_pic` 的共享元素动画，迁移为 Kotlin 时必须完整保留其视图层级、缩放类型及 `onLayout` 时机，不可随意改写为异步加载占位导致 `ExistingViewFinder` 判定失败。

### 已解决记录示例（后续真实解决条目紧随其后追加）
- [x] ~~`[示例]` 某个模块在 Kotlin 迁移后出现空指针或编译告警~~（解决方案：记录具体根因、修改文件与提交说明）
- [x] ~~`[P0-构建环境]` 当前宿主机为 ARM64 (`aarch64`) Linux，而 Android SDK `aapt2`、RN `hermesc` 与 NDK `clang` 为 `x86_64` 二进制；同时环境仅装有 JRE（缺 `jlink`）且无正式 `android/keystore.properties`~~（解决方案：安装 `qemu-user`、`qemu-user-binfmt`、`libc6-amd64-cross`、`libstdc++6-amd64-cross`、`libgcc-s1-amd64-cross`、`openjdk-17-jdk`，并向 `/usr/x86_64-linux-gnu/lib/` 补入 `zlib1g` amd64 的 `libz.so.1`；后续运行 Gradle 统一携带 `QEMU_LD_PREFIX=/usr/x86_64-linux-gnu` 与 `-PMYAPP_UPLOAD_STORE_FILE=debug.keystore -PMYAPP_UPLOAD_STORE_PASSWORD=android -PMYAPP_UPLOAD_KEY_ALIAS=androiddebugkey -PMYAPP_UPLOAD_KEY_PASSWORD=android`）
- [x] ~~`[P0-MainApplication]` `NavigationApplication`（实现 Kotlin 接口 `ReactApplication`）与 `DefaultReactNativeHost` 在 RN 0.73 下要求使用 Kotlin 属性 `override val reactNativeHost` / `isNewArchEnabled` / `isHermesEnabled` 而非 Java getter 方法~~（解决方案：将 `MainApplication.kt` 中的 `getReactNativeHost()` 及方法式覆写改为 Kotlin 属性覆写）
