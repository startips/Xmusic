// 修补依赖源码以使构建的依赖恢复正常工作
// 该脚本在 npm install 之后自动执行（见 package.json 的 postinstall）

const fs = require('node:fs')
const path = require('node:path')

const rootPath = path.join(__dirname, './')

const playerMetadata = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/metadata/MetadataManager.java',
)
const playerMusicService = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/MusicService.java',
)
const playerButtonEvents = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/metadata/ButtonEvents.java',
)
const playerMusicEvents = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/module/MusicEvents.java',
)
const playerMusicBinder = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/MusicBinder.java',
)
const playerMusicModule = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/module/MusicModule.java',
)
const playerExoPlayback = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/player/ExoPlayback.java',
)
const playerLocalPlayback = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/player/LocalPlayback.java',
)
const playerMusicManager = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/MusicManager.java',
)
const playerDspConfig = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/player/XmusicDspConfig.java',
)
const playerDspProcessor = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/player/XmusicDspAudioProcessor.java',
)
const rnnSystemUiUtils = path.join(
  rootPath,
  'node_modules/react-native-navigation/lib/android/app/src/main/java/com/reactnativenavigation/utils/SystemUiUtils.kt',
)
const rnnPresenter = path.join(
  rootPath,
  'node_modules/react-native-navigation/lib/android/app/src/main/java/com/reactnativenavigation/viewcontrollers/viewcontroller/Presenter.java',
)
const rnnComponentViewController = path.join(
  rootPath,
  'node_modules/react-native-navigation/lib/android/app/src/main/java/com/reactnativenavigation/viewcontrollers/component/ComponentViewController.java',
)
const rnnExistingViewFinder = path.join(
  rootPath,
  'node_modules/react-native-navigation/lib/android/app/src/main/java/com/reactnativenavigation/views/element/finder/ExistingViewFinder.kt',
)
const rnnStackAnimator = path.join(
  rootPath,
  'node_modules/react-native-navigation/lib/android/app/src/main/java/com/reactnativenavigation/viewcontrollers/stack/StackAnimator.kt',
)

const patchs = [
  // 1. 同时写入 MEDIA_METADATA_KEY_ART，部分系统（含 HyperOS 超级岛）只读取该字段
  [
    playerMetadata,
    'import static android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ARTIST;',
    'import static android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ART;\nimport static android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ARTIST;',
  ],
  // 2. 提高封面解码分辨率（768px 兼顾 xxxhdpi 超级岛清晰度与 Binder IPC 体积）
  [
    playerMetadata,
    '                .override(512, 512)',
    '                .override(768, 768)',
    '                .override(1024, 1024)',
  ],
  // 3. updateArtwork 同步 ART 位图
  [
    playerMetadata,
    '        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, bitmap);\n        builder.setLargeIcon(bitmap);',
    '        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, bitmap);\n        metadata.putBitmap(METADATA_KEY_ART, bitmap);\n        builder.setLargeIcon(bitmap);',
  ],
  // 4. 复用封面缓存时同步 ART 位图并校验未回收
  [
    playerMetadata,
    '        } else if (track.artwork.equals(prevArtwork) && prevArtResource != null) {\n            metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, prevArtResource);\n            builder.setLargeIcon(prevArtResource);',
    '        } else if (track.artwork.equals(prevArtwork) && prevArtResource != null && !prevArtResource.isRecycled()) {\n            metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, prevArtResource);\n            metadata.putBitmap(METADATA_KEY_ART, prevArtResource);\n            builder.setLargeIcon(prevArtResource);',
    '        } else if (track.artwork.equals(prevArtwork) && prevArtResource != null) {\n            metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, prevArtResource);\n            metadata.putBitmap(METADATA_KEY_ART, prevArtResource);\n            builder.setLargeIcon(prevArtResource);',
  ],
  // 5. Glide 加载完成后同步 ART 位图，保持 artworkTarget 存活至切歌清理以防池化 Bitmap 被提前回收
  [
    playerMetadata,
    '                        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, resource);\n                        builder.setLargeIcon(resource);\n\n                        session.setMetadata(metadata.build());\n                        updateNotification();\n                        artworkTarget = null;\n                    }\n\n                    @Override\n                    public void onLoadCleared(@Nullable Drawable placeholder) { }',
    '                        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, resource);\n                        metadata.putBitmap(METADATA_KEY_ART, resource);\n                        builder.setLargeIcon(resource);\n\n                        session.setMetadata(metadata.build());\n                        updateNotification();\n                    }\n\n                    @Override\n                    public void onLoadCleared(@Nullable Drawable placeholder) {\n                        prevArtResource = null;\n                    }',
    '                        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, resource);\n                        metadata.putBitmap(METADATA_KEY_ART, resource);\n                        builder.setLargeIcon(resource);\n\n                        session.setMetadata(metadata.build());\n                        updateNotification();\n                        artworkTarget = null;\n                    }\n\n                    @Override\n                    public void onLoadCleared(@Nullable Drawable placeholder) { }',
  ],
  // 6. 更新标题 / 歌词时保持封面位图，并空判 playback 防止未就绪 NPE
  [
    playerMetadata,
    '      session.setMetadata(prevMetadata.build());\n      updatePlaybackState(manager.getPlayback());',
    '      if (prevArtResource != null && !prevArtResource.isRecycled()) {\n        prevMetadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, prevArtResource);\n        prevMetadata.putBitmap(METADATA_KEY_ART, prevArtResource);\n      }\n      session.setMetadata(prevMetadata.build());\n      ExoPlayback currentPlayback = manager.getPlayback();\n      if (currentPlayback != null) {\n        updatePlaybackState(currentPlayback);\n      }',
    '      if (prevArtResource != null) {\n        prevMetadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, prevArtResource);\n        prevMetadata.putBitmap(METADATA_KEY_ART, prevArtResource);\n      }\n      session.setMetadata(prevMetadata.build());\n      updatePlaybackState(manager.getPlayback());',
  ],
  // 7. 划掉多任务触发 onTaskRemoved 且 stopWithApp 为 true 时终止进程，避免旧 MusicBinder 持有已释放的 ExoPlayer 导致立即重开无法播放
  [
    playerMusicService,
    '            destroy();\n            stopSelf();\n        }',
    '            destroy();\n            stopSelf();\n            android.os.Process.killProcess(android.os.Process.myPid());\n        }',
  ],
  // 8. 媒体会话与通知栏新增收藏状态字段（适配 HyperOS 超级岛、下拉控制中心与锁屏媒体控件）
  [
    playerMetadata,
    '    private Action previousAction, rewindAction, playAction, pauseAction, stopAction, forwardAction, nextAction;',
    '    public static final String ACTION_TOGGLE_FAVORITE = "xmusic_toggle_favorite";\n    private boolean isFavorite = false;\n    private boolean lastPlaying = false;\n    private int favoriteOnIconRes = 0;\n    private int favoriteOffIconRes = 0;\n\n    private Action previousAction, rewindAction, playAction, pauseAction, stopAction, forwardAction, nextAction;',
  ],
  // 9. 通知栏 MediaStyle 加入第 5 槽红心 Action，同步更新 Notification 与 PlaybackStateCompat CustomAction
  [
    playerMetadata,
    '    public void updatePlayback(boolean playing) {\n        List<Integer> compact = new ArrayList<>();\n        builder.mActions.clear();',
    '    public void updatePlayback(boolean playing) {\n        this.lastPlaying = playing;\n        List<Integer> compact = new ArrayList<>();\n        builder.mActions.clear();',
  ],
  [
    playerMetadata,
    '        addAction(nextAction, PlaybackStateCompat.ACTION_SKIP_TO_NEXT, compact);\n\n        // Prevent the media style',
    '        addAction(nextAction, PlaybackStateCompat.ACTION_SKIP_TO_NEXT, compact);\n        Action favAction = createFavoriteAction();\n        if (favAction != null) builder.mActions.add(favAction);\n\n        // Prevent the media style',
  ],
  [
    playerMetadata,
    '    private void updatePlaybackState(ExoPlayback playback) {\n        // Updates the media session state\n        PlaybackStateCompat.Builder pb = new PlaybackStateCompat.Builder();\n        pb.setActions(actions);\n        pb.setState(playback.getState(), playback.getPosition(), playback.getRate());\n        pb.setBufferedPosition(playback.getBufferedPosition());\n\n        session.setPlaybackState(pb.build());\n    }',
    '    private int getFavoriteIconRes(boolean favorite) {\n        if (favorite) {\n            if (favoriteOnIconRes == 0) {\n                favoriteOnIconRes = service.getResources().getIdentifier("ic_media_favorite_on", "drawable", service.getPackageName());\n            }\n            return favoriteOnIconRes;\n        }\n        if (favoriteOffIconRes == 0) {\n            favoriteOffIconRes = service.getResources().getIdentifier("ic_media_favorite_off", "drawable", service.getPackageName());\n        }\n        return favoriteOffIconRes;\n    }\n\n    @SuppressLint("UnspecifiedImmutableFlag")\n    private Action createFavoriteAction() {\n        int favIcon = getFavoriteIconRes(isFavorite);\n        if (favIcon == 0) return null;\n        Intent favIntent = new Intent(service, MusicService.class);\n        favIntent.setAction(ACTION_TOGGLE_FAVORITE);\n        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M\n            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE\n            : PendingIntent.FLAG_UPDATE_CURRENT;\n        PendingIntent pi = PendingIntent.getService(service, 1001, favIntent, flags);\n        return new Action(favIcon, isFavorite ? "已收藏" : "收藏", pi);\n    }\n\n    public void setFavorite(boolean favorite) {\n        if (this.isFavorite == favorite) return;\n        this.isFavorite = favorite;\n        ExoPlayback playback = manager.getPlayback();\n        if (playback != null) {\n            updatePlayback(lastPlaying);\n            updatePlaybackState(playback);\n            updateNotification();\n        }\n    }\n\n    private void updatePlaybackState(ExoPlayback playback) {\n        // Updates the media session state\n        PlaybackStateCompat.Builder pb = new PlaybackStateCompat.Builder();\n        pb.setActions(actions);\n        pb.setState(playback.getState(), playback.getPosition(), playback.getRate());\n        pb.setBufferedPosition(playback.getBufferedPosition());\n\n        int favIcon = getFavoriteIconRes(isFavorite);\n        if (favIcon != 0) {\n            Bundle extras = new Bundle();\n            extras.putBoolean("isFavorite", isFavorite);\n            pb.addCustomAction(new PlaybackStateCompat.CustomAction.Builder(\n                ACTION_TOGGLE_FAVORITE,\n                isFavorite ? "已收藏" : "收藏",\n                favIcon\n            ).setExtras(extras).build());\n        }\n\n        session.setPlaybackState(pb.build());\n    }',
    '    public void setFavorite(boolean favorite) {\n        this.isFavorite = favorite;\n        ExoPlayback playback = manager.getPlayback();\n        if (playback != null) {\n            updatePlayback(lastPlaying);\n            updatePlaybackState(playback);\n            updateNotification();\n        }\n    }',
  ],
  // 10. MusicEvents 新增红心切换事件常量
  [
    playerMusicEvents,
    '    public static final String BUTTON_DUCK = "remote-duck";',
    '    public static final String BUTTON_DUCK = "remote-duck";\n    public static final String BUTTON_TOGGLE_FAVORITE = "remote-toggle-favorite";',
  ],
  // 11. ButtonEvents 处理 MediaSession onCustomAction 回调
  [
    playerButtonEvents,
    '    @Override\n    public void onSetRating(RatingCompat rating) {\n        Bundle bundle = new Bundle();\n        Utils.setRating(bundle, "rating", rating);\n        service.emit(MusicEvents.BUTTON_SET_RATING, bundle);\n    }\n}',
    '    @Override\n    public void onSetRating(RatingCompat rating) {\n        Bundle bundle = new Bundle();\n        Utils.setRating(bundle, "rating", rating);\n        service.emit(MusicEvents.BUTTON_SET_RATING, bundle);\n    }\n\n    @Override\n    public void onCustomAction(String action, Bundle extras) {\n        if (MetadataManager.ACTION_TOGGLE_FAVORITE.equals(action)) {\n            service.emit(MusicEvents.BUTTON_TOGGLE_FAVORITE, null);\n        }\n    }\n}',
  ],
  // 12. MusicService 引入包并在 onStartCommand 安全拦截收藏 PendingIntent（防未初始化僵尸通知与重复创建 MusicManager）
  [
    playerMusicService,
    'import com.facebook.react.ReactInstanceManager;',
    'import com.facebook.react.ReactInstanceManager;\nimport com.guichaguri.trackplayer.module.MusicEvents;\nimport com.guichaguri.trackplayer.service.metadata.MetadataManager;',
  ],
  [
    playerMusicService,
    '    @Override\n    public int onStartCommand(Intent intent, int flags, int startId) {\n        if(intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {',
    '    @Override\n    public int onStartCommand(Intent intent, int flags, int startId) {\n        if(intent != null && MetadataManager.ACTION_TOGGLE_FAVORITE.equals(intent.getAction())) {\n            if (manager == null) {\n                onStartForeground();\n                return START_NOT_STICKY;\n            }\n            emit(MusicEvents.BUTTON_TOGGLE_FAVORITE, null);\n            return START_NOT_STICKY;\n        }\n\n        if(intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {',
    '    @Override\n    public int onStartCommand(Intent intent, int flags, int startId) {\n        if(intent != null && MetadataManager.ACTION_TOGGLE_FAVORITE.equals(intent.getAction())) {\n            emit(MusicEvents.BUTTON_TOGGLE_FAVORITE, null);\n            return START_NOT_STICKY;\n        }\n\n        if(intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {',
  ],
  [
    playerMusicService,
    '        manager = new MusicManager(this);\n        handler = new Handler();',
    '        if (manager == null) {\n            manager = new MusicManager(this);\n            handler = new Handler();\n        }',
  ],
  // 13. MusicBinder 转发 setFavoriteState
  [
    playerMusicBinder,
    '    public int getRatingType() {\n        return manager.getMetadata().getRatingType();\n    }',
    '    public int getRatingType() {\n        return manager.getMetadata().getRatingType();\n    }\n\n    public void setFavoriteState(boolean favorite) {\n        manager.getMetadata().setFavorite(favorite);\n    }',
  ],
  // 14. MusicModule 保存与同步红心收藏状态
  [
    playerMusicModule,
    '    private Bundle options;\n    ReactApplicationContext reactAppContext;',
    '    private Bundle options;\n    private boolean favoriteState = false;\n    ReactApplicationContext reactAppContext;',
  ],
  // 15. 服务连接后同步当前红心状态
  [
    playerMusicModule,
    '        // Reapply options that user set before with updateOptions\n        if (options != null) {\n            binder.updateOptions(options);\n        }',
    '        // Reapply options that user set before with updateOptions\n        if (options != null) {\n            binder.updateOptions(options);\n        }\n        binder.setFavoriteState(favoriteState);',
  ],
  // 16. MusicModule 暴露 setFavoriteState 与冷启动防空白通知保护
  [
    playerMusicModule,
    '    @ReactMethod\n    public void updateNowPlayingTitles(ReadableMap map, final Promise callback) {\n      final Bundle data = Arguments.toBundle(map);\n\n      waitForConnection(() -> {\n        binder.updateNowPlayingTitles(data);\n        callback.resolve(null);\n      });\n    }',
    '    @ReactMethod\n    public void updateNowPlayingTitles(ReadableMap map, final Promise callback) {\n      if (binder == null) {\n        callback.resolve(null);\n        return;\n      }\n      final Bundle data = Arguments.toBundle(map);\n      binder.post(() -> {\n        if (binder != null) binder.updateNowPlayingTitles(data);\n        callback.resolve(null);\n      });\n    }',
  ],
  [
    playerMusicModule,
    '    @ReactMethod\n    public void getState(final Promise callback) {\n        if (binder == null) {\n            callback.resolve(PlaybackStateCompat.STATE_NONE);\n        } else {\n            waitForConnection(() -> callback.resolve(binder.getPlayback().getState()));\n        }\n    }\n}',
    '    @ReactMethod\n    public void setFavoriteState(final boolean favorite, final Promise callback) {\n        this.favoriteState = favorite;\n        if (binder != null) {\n            binder.post(() -> {\n                if (binder != null) binder.setFavoriteState(favorite);\n                callback.resolve(null);\n            });\n        } else {\n            callback.resolve(null);\n        }\n    }\n\n    @ReactMethod\n    public void getState(final Promise callback) {\n        if (binder == null) {\n            callback.resolve(PlaybackStateCompat.STATE_NONE);\n        } else {\n            waitForConnection(() -> callback.resolve(binder.getPlayback().getState()));\n        }\n    }\n}',
  ],
  // 17. 保持 Edge-to-Edge 全屏绘制（不因显示系统栏而重置 decorFitsSystemWindows，透明导航栏关闭系统强制对比度遮罩）
  [
    rnnSystemUiUtils,
    '    fun showNavigationBar(window: Window?, view: View) {\n        window?.let {\n            WindowCompat.setDecorFitsSystemWindows(window, true)\n            WindowInsetsControllerCompat(window, view).show(WindowInsetsCompat.Type.navigationBars())\n        }\n    }',
    '    fun showNavigationBar(window: Window?, view: View) {\n        window?.let {\n            WindowCompat.setDecorFitsSystemWindows(window, false)\n            WindowInsetsControllerCompat(window, view).show(WindowInsetsCompat.Type.navigationBars())\n        }\n    }',
  ],
  [
    rnnSystemUiUtils,
    '    fun showStatusBar(window: Window?, view: View) {\n        window?.let {\n            WindowCompat.setDecorFitsSystemWindows(window, true)\n            WindowInsetsControllerCompat(window, view).show(WindowInsetsCompat.Type.statusBars())\n        }\n    }',
    '    fun showStatusBar(window: Window?, view: View) {\n        window?.let {\n            WindowCompat.setDecorFitsSystemWindows(window, false)\n            WindowInsetsControllerCompat(window, view).show(WindowInsetsCompat.Type.statusBars())\n        }\n    }',
  ],
  [
    rnnSystemUiUtils,
    '            WindowInsetsControllerCompat(window, window.decorView).let { controller ->\n                controller.isAppearanceLightNavigationBars = lightColor\n            }\n            window.navigationBarColor = color',
    '            WindowInsetsControllerCompat(window, window.decorView).let { controller ->\n                controller.isAppearanceLightNavigationBars = lightColor\n            }\n            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {\n                window.isNavigationBarContrastEnforced = false\n            }\n            window.navigationBarColor = color',
  ],
  // 18. 透明导航栏下依据 statusBar.textColorScheme 同步手势条亮暗对比度，包括栈返回 onViewBroughtToFront
  [
    rnnPresenter,
    '        mergeStatusBarOptions(viewController.getView(), withDefaults.statusBar);\n        mergeNavigationBarOptions(withDefaults.navigationBar);',
    '        mergeStatusBarOptions(viewController.getView(), withDefaults.statusBar);\n        mergeNavigationBarOptions(withDefaults);',
  ],
  [
    rnnPresenter,
    '        applyStatusBarOptions(view, withDefaultOptions);\n        applyNavigationBarOptions(withDefaultOptions.navigationBar);',
    '        applyStatusBarOptions(view, withDefaultOptions);\n        applyNavigationBarOptions(withDefaultOptions);',
  ],
  [
    rnnPresenter,
    '    public void onViewBroughtToFront(ViewController<?> viewController, Options options) {\n        Options withDefaultOptions = options.copy().withDefaultOptions(defaultOptions);\n        applyStatusBarOptions(viewController, withDefaultOptions);\n    }',
    '    public void onViewBroughtToFront(ViewController<?> viewController, Options options) {\n        Options withDefaultOptions = options.copy().withDefaultOptions(defaultOptions);\n        applyStatusBarOptions(viewController, withDefaultOptions);\n        applyNavigationBarOptions(withDefaultOptions);\n    }',
  ],
  [
    rnnPresenter,
    '    private void applyNavigationBarOptions(NavigationBarOptions options) {\n        applyNavigationBarVisibility(options);\n        setNavigationBarBackgroundColor(options);\n    }\n\n    private void mergeNavigationBarOptions(NavigationBarOptions options) {\n        mergeNavigationBarVisibility(options);\n        setNavigationBarBackgroundColor(options);\n    }',
    '    private void applyNavigationBarOptions(Options options) {\n        applyNavigationBarVisibility(options.navigationBar);\n        setNavigationBarBackgroundColor(options);\n    }\n\n    private void mergeNavigationBarOptions(Options options) {\n        mergeNavigationBarVisibility(options.navigationBar);\n        setNavigationBarBackgroundColor(options);\n    }',
  ],
  [
    rnnPresenter,
    '    private void setNavigationBarBackgroundColor(NavigationBarOptions navigationBar) {\n        int navigationBarDefaultColor = SystemUiUtils.INSTANCE.getNavigationBarDefaultColor();\n        navigationBarDefaultColor = navigationBarDefaultColor == -1 ? Color.BLACK : navigationBarDefaultColor;\n        if (navigationBar.backgroundColor.canApplyValue()) {\n            int color = navigationBar.backgroundColor.get(navigationBarDefaultColor);\n            SystemUiUtils.setNavigationBarBackgroundColor(activity.getWindow(), color, isColorLight(color));\n        } else {\n            SystemUiUtils.setNavigationBarBackgroundColor(activity.getWindow(), navigationBarDefaultColor, isColorLight(navigationBarDefaultColor));\n\n        }\n    }',
    '    private void setNavigationBarBackgroundColor(Options options) {\n        NavigationBarOptions navigationBar = options.navigationBar;\n        int navigationBarDefaultColor = SystemUiUtils.INSTANCE.getNavigationBarDefaultColor();\n        navigationBarDefaultColor = navigationBarDefaultColor == -1 ? Color.BLACK : navigationBarDefaultColor;\n        int color = navigationBar.backgroundColor.canApplyValue()\n                ? navigationBar.backgroundColor.get(navigationBarDefaultColor)\n                : Color.TRANSPARENT;\n        boolean lightNav = Color.alpha(color) == 0\n                ? isDarkTextColorScheme(options.statusBar)\n                : isColorLight(color);\n        SystemUiUtils.setNavigationBarBackgroundColor(activity.getWindow(), color, lightNav);\n    }',
  ],
  [
    rnnPresenter,
    '    private void mergeNavigationBarVisibility(NavigationBarOptions options) {\n        if (options.isVisible.hasValue()) applyNavigationBarOptions(options);\n    }',
    '    private void mergeNavigationBarVisibility(NavigationBarOptions options) {\n        if (options.isVisible.hasValue()) applyNavigationBarVisibility(options);\n    }',
  ],
  [
    rnnPresenter,
    '        setNavigationBarBackgroundColor(withDefault.navigationBar);',
    '        setNavigationBarBackgroundColor(withDefault);',
  ],
  // 19. ExoPlayback 暴露音频会话 ID 与柔和启停/淡入淡出配置接口
  [
    playerExoPlayback,
    '    public abstract void setPlayerVolume(float volume);',
    '    public abstract void setPlayerVolume(float volume);\n\n    public int getAudioSessionId() {\n        return 0;\n    }\n\n    public void setAudioTransitionConfig(boolean softPlayPause, int crossfadeMs) {\n    }\n\n    protected boolean isPauseRamping() {\n        return false;\n    }',
  ],
  [
    playerExoPlayback,
    '            case Player.STATE_READY:\n                return player.getPlayWhenReady() && player.isPlaying() ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;',
    '            case Player.STATE_READY:\n                if (isPauseRamping()) return PlaybackStateCompat.STATE_PAUSED;\n                return player.getPlayWhenReady() && player.isPlaying() ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;',
  ],
  // 20. LocalPlayback 实现 60fps 柔和启停音量包络、曲末/曲首平滑渐变及 AudioSession 广播
  [
    playerLocalPlayback,
    '    private SimpleCache cache;\n    private boolean prepared = false;',
    '    private SimpleCache cache;\n    private boolean prepared = false;\n    private float userVolume = 1.0F;\n    private float rampFactor = 1.0F;\n    private float eofFactor = 1.0F;\n    private boolean softPlayPause = true;\n    private int crossfadeMs = 2000;\n    private boolean pauseRamping = false;\n    private boolean freshTrack = true;\n    private int pendingPlayRampMs = 0;\n    private final android.os.Handler rampHandler = new android.os.Handler(android.os.Looper.getMainLooper());\n    private Runnable activeRampTask = null;\n    private final Runnable eofMonitorTask = new Runnable() {\n        @Override\n        public void run() {\n            rampHandler.removeCallbacks(this);\n            if (crossfadeMs <= 0 || pauseRamping || !player.isPlaying()) {\n                if (eofFactor != 1.0F) {\n                    eofFactor = 1.0F;\n                    applyEffectiveVolume();\n                }\n                return;\n            }\n            long duration = getDuration();\n            long pos = player.getCurrentPosition();\n            if (duration > 8000 && pos > 0) {\n                long remaining = duration - pos;\n                if (remaining > 0 && remaining <= crossfadeMs) {\n                    eofFactor = Math.max(0.05F, Math.min(1.0F, (float) remaining / (float) crossfadeMs));\n                    applyEffectiveVolume();\n                } else if (eofFactor != 1.0F) {\n                    eofFactor = 1.0F;\n                    applyEffectiveVolume();\n                }\n            }\n            rampHandler.postDelayed(this, 100);\n        }\n    };',
    '    private SimpleCache cache;\n    private boolean prepared = false;\n    private float userVolume = 1.0F;\n    private float rampFactor = 1.0F;\n    private float eofFactor = 1.0F;\n    private boolean softPlayPause = true;\n    private int crossfadeMs = 2000;\n    private boolean pauseRamping = false;\n    private boolean freshTrack = true;\n    private final android.os.Handler rampHandler = new android.os.Handler(android.os.Looper.getMainLooper());\n    private Runnable activeRampTask = null;\n    private final Runnable eofMonitorTask = new Runnable() {\n        @Override\n        public void run() {\n            rampHandler.removeCallbacks(this);\n            if (crossfadeMs <= 0 || pauseRamping || !player.isPlaying()) {\n                if (eofFactor != 1.0F) {\n                    eofFactor = 1.0F;\n                    applyEffectiveVolume();\n                }\n                return;\n            }\n            long duration = getDuration();\n            long pos = player.getCurrentPosition();\n            if (duration > 8000 && pos > 0) {\n                long remaining = duration - pos;\n                if (remaining > 0 && remaining <= crossfadeMs) {\n                    eofFactor = Math.max(0.05F, Math.min(1.0F, (float) remaining / (float) crossfadeMs));\n                    applyEffectiveVolume();\n                } else if (eofFactor != 1.0F) {\n                    eofFactor = 1.0F;\n                    applyEffectiveVolume();\n                }\n            }\n            rampHandler.postDelayed(this, 100);\n        }\n    };',
  ],
  [
    playerLocalPlayback,
    '        super.initialize();\n\n        resetQueue();',
    '        super.initialize();\n\n        resetQueue();\n        broadcastAudioSession(player.getAudioSessionId());',
  ],
  [
    playerLocalPlayback,
    '    @Override\n    public void play() {\n        prepare();\n        super.play();\n    }\n\n    @Override\n    public void stop() {\n        super.stop();\n        prepared = false;\n    }',
    '    private void cancelActiveRamp() {\n        if (activeRampTask != null) {\n            rampHandler.removeCallbacks(activeRampTask);\n            activeRampTask = null;\n        }\n    }\n\n    private void applyEffectiveVolume() {\n        float effective = Math.max(0.0F, Math.min(1.0F, userVolume * volumeMultiplier * rampFactor * eofFactor));\n        player.setVolume(effective);\n    }\n\n    private void broadcastAudioSession(int sessionId) {\n        try {\n            android.content.Intent intent = new android.content.Intent("com.startips.xmusic.AUDIO_SESSION_CHANGED");\n            intent.setPackage(context.getPackageName());\n            intent.putExtra("audioSessionId", sessionId);\n            context.sendBroadcast(intent);\n        } catch (Exception ignored) {}\n    }\n\n    @Override\n    public int getAudioSessionId() {\n        return player.getAudioSessionId();\n    }\n\n    @Override\n    public void onAudioSessionIdChanged(int audioSessionId) {\n        broadcastAudioSession(audioSessionId);\n    }\n\n    @Override\n    public void onIsPlayingChanged(boolean isPlaying) {\n        if (isPlaying) {\n            maybeStartPendingPlayRamp();\n        }\n    }\n\n    private void startFadeInRamp(final float startFactor, final int durationMs) {\n        cancelActiveRamp();\n        rampFactor = startFactor;\n        applyEffectiveVolume();\n        final long startTime = android.os.SystemClock.uptimeMillis();\n        activeRampTask = new Runnable() {\n            @Override\n            public void run() {\n                long elapsed = android.os.SystemClock.uptimeMillis() - startTime;\n                float t = Math.min(1.0F, (float) elapsed / (float) durationMs);\n                float eased = 1.0F - (1.0F - t) * (1.0F - t) * (1.0F - t);\n                rampFactor = startFactor + (1.0F - startFactor) * eased;\n                applyEffectiveVolume();\n                if (t < 1.0F) {\n                    rampHandler.postDelayed(this, 16);\n                } else {\n                    activeRampTask = null;\n                }\n            }\n        };\n        rampHandler.postDelayed(activeRampTask, 16);\n    }\n\n    private void maybeStartPendingPlayRamp() {\n        if (pendingPlayRampMs <= 0 || pauseRamping || !player.isPlaying()) return;\n        int dur = pendingPlayRampMs;\n        pendingPlayRampMs = 0;\n        startFadeInRamp(0.0F, dur);\n        if (crossfadeMs > 0) rampHandler.postDelayed(eofMonitorTask, 120);\n    }\n\n    @Override\n    public void setAudioTransitionConfig(boolean softPlayPause, int crossfadeMs) {\n        this.softPlayPause = softPlayPause;\n        this.crossfadeMs = Math.max(0, Math.min(crossfadeMs, 6000));\n        if (this.crossfadeMs <= 0 && eofFactor != 1.0F) {\n            eofFactor = 1.0F;\n            applyEffectiveVolume();\n        } else if (this.crossfadeMs > 0 && player.isPlaying() && !pauseRamping) {\n            rampHandler.post(eofMonitorTask);\n        }\n    }\n\n    @Override\n    protected boolean isPauseRamping() {\n        return pauseRamping;\n    }\n\n    @Override\n    public void skip(int index, Promise promise) {\n        cancelActiveRamp();\n        pauseRamping = false;\n        pendingPlayRampMs = 0;\n        freshTrack = true;\n        eofFactor = 1.0F;\n        rampFactor = 1.0F;\n        super.skip(index, promise);\n    }\n\n    @Override\n    public void play() {\n        cancelActiveRamp();\n        boolean wasPauseRamping = pauseRamping;\n        pauseRamping = false;\n        pendingPlayRampMs = 0;\n        eofFactor = 1.0F;\n        prepare();\n        boolean useTrackFadeIn = freshTrack && crossfadeMs > 0;\n        freshTrack = false;\n        final int durationMs = useTrackFadeIn ? Math.min(crossfadeMs, 1400) : (softPlayPause ? 240 : 0);\n        if (durationMs <= 0) {\n            rampFactor = 1.0F;\n            applyEffectiveVolume();\n            super.play();\n            if (crossfadeMs > 0) rampHandler.postDelayed(eofMonitorTask, 120);\n            return;\n        }\n        if (player.isPlaying()) {\n            final float startFactor = wasPauseRamping ? Math.max(0.0F, rampFactor) : Math.max(0.0F, rampFactor);\n            super.play();\n            startFadeInRamp(startFactor, durationMs);\n            if (crossfadeMs > 0) rampHandler.postDelayed(eofMonitorTask, 120);\n            return;\n        }\n        rampFactor = 0.0F;\n        pendingPlayRampMs = durationMs;\n        applyEffectiveVolume();\n        super.play();\n        maybeStartPendingPlayRamp();\n    }\n\n    @Override\n    public void pause() {\n        pendingPlayRampMs = 0;\n        rampHandler.removeCallbacks(eofMonitorTask);\n        if (!softPlayPause || !player.isPlaying() || !player.getPlayWhenReady()) {\n            cancelActiveRamp();\n            pauseRamping = false;\n            rampFactor = 1.0F;\n            eofFactor = 1.0F;\n            super.pause();\n            applyEffectiveVolume();\n            return;\n        }\n        if (pauseRamping) return;\n        cancelActiveRamp();\n        pauseRamping = true;\n        previousState = android.support.v4.media.session.PlaybackStateCompat.STATE_PAUSED;\n        manager.onPause();\n        manager.onStateChange(previousState);\n        final float startFactor = Math.max(0.05F, rampFactor * eofFactor);\n        final int durationMs = 200;\n        final long startTime = android.os.SystemClock.uptimeMillis();\n        activeRampTask = new Runnable() {\n            @Override\n            public void run() {\n                if (!pauseRamping) return;\n                long elapsed = android.os.SystemClock.uptimeMillis() - startTime;\n                float t = Math.min(1.0F, (float) elapsed / (float) durationMs);\n                float eased = (1.0F - t) * (1.0F - t);\n                rampFactor = startFactor * eased;\n                applyEffectiveVolume();\n                if (t < 1.0F) {\n                    rampHandler.postDelayed(this, 16);\n                } else {\n                    activeRampTask = null;\n                    pauseRamping = false;\n                    LocalPlayback.super.pause();\n                    rampFactor = 1.0F;\n                    eofFactor = 1.0F;\n                    applyEffectiveVolume();\n                }\n            }\n        };\n        rampHandler.postDelayed(activeRampTask, 16);\n    }\n\n    @Override\n    public void stop() {\n        cancelActiveRamp();\n        rampHandler.removeCallbacks(eofMonitorTask);\n        pendingPlayRampMs = 0;\n        pauseRamping = false;\n        freshTrack = true;\n        rampFactor = 1.0F;\n        eofFactor = 1.0F;\n        super.stop();\n        applyEffectiveVolume();\n        prepared = false;\n    }',
    '    private void cancelActiveRamp() {\n        if (activeRampTask != null) {\n            rampHandler.removeCallbacks(activeRampTask);\n            activeRampTask = null;\n        }\n    }\n\n    private void applyEffectiveVolume() {\n        float effective = Math.max(0.0F, Math.min(1.0F, userVolume * volumeMultiplier * rampFactor * eofFactor));\n        player.setVolume(effective);\n    }\n\n    private void broadcastAudioSession(int sessionId) {\n        try {\n            android.content.Intent intent = new android.content.Intent("com.startips.xmusic.AUDIO_SESSION_CHANGED");\n            intent.setPackage(context.getPackageName());\n            intent.putExtra("audioSessionId", sessionId);\n            context.sendBroadcast(intent);\n        } catch (Exception ignored) {}\n    }\n\n    @Override\n    public int getAudioSessionId() {\n        return player.getAudioSessionId();\n    }\n\n    @Override\n    public void onAudioSessionIdChanged(int audioSessionId) {\n        broadcastAudioSession(audioSessionId);\n    }\n\n    @Override\n    public void setAudioTransitionConfig(boolean softPlayPause, int crossfadeMs) {\n        this.softPlayPause = softPlayPause;\n        this.crossfadeMs = Math.max(0, Math.min(crossfadeMs, 6000));\n        if (this.crossfadeMs <= 0 && eofFactor != 1.0F) {\n            eofFactor = 1.0F;\n            applyEffectiveVolume();\n        } else if (this.crossfadeMs > 0 && player.isPlaying() && !pauseRamping) {\n            rampHandler.post(eofMonitorTask);\n        }\n    }\n\n    @Override\n    protected boolean isPauseRamping() {\n        return pauseRamping;\n    }\n\n    @Override\n    public void skip(int index, Promise promise) {\n        cancelActiveRamp();\n        pauseRamping = false;\n        freshTrack = true;\n        eofFactor = 1.0F;\n        rampFactor = 1.0F;\n        super.skip(index, promise);\n    }\n\n    @Override\n    public void play() {\n        cancelActiveRamp();\n        boolean wasPauseRamping = pauseRamping;\n        pauseRamping = false;\n        eofFactor = 1.0F;\n        prepare();\n        boolean useTrackFadeIn = freshTrack && crossfadeMs > 0;\n        freshTrack = false;\n        final int durationMs = useTrackFadeIn ? Math.min(crossfadeMs, 1400) : (softPlayPause ? 220 : 0);\n        if (durationMs <= 0) {\n            rampFactor = 1.0F;\n            applyEffectiveVolume();\n            super.play();\n            if (crossfadeMs > 0) rampHandler.postDelayed(eofMonitorTask, 120);\n            return;\n        }\n        final float startFactor = wasPauseRamping ? Math.max(0.04F, rampFactor) : (player.isPlaying() ? Math.max(0.08F, rampFactor) : 0.04F);\n        rampFactor = startFactor;\n        applyEffectiveVolume();\n        super.play();\n        final long startTime = android.os.SystemClock.uptimeMillis();\n        activeRampTask = new Runnable() {\n            @Override\n            public void run() {\n                long elapsed = android.os.SystemClock.uptimeMillis() - startTime;\n                float t = Math.min(1.0F, (float) elapsed / (float) durationMs);\n                float eased = 1.0F - (1.0F - t) * (1.0F - t) * (1.0F - t);\n                rampFactor = startFactor + (1.0F - startFactor) * eased;\n                applyEffectiveVolume();\n                if (t < 1.0F) {\n                    rampHandler.postDelayed(this, 16);\n                } else {\n                    activeRampTask = null;\n                }\n            }\n        };\n        rampHandler.postDelayed(activeRampTask, 16);\n        if (crossfadeMs > 0) rampHandler.postDelayed(eofMonitorTask, 120);\n    }\n\n    @Override\n    public void pause() {\n        rampHandler.removeCallbacks(eofMonitorTask);\n        if (!softPlayPause || !player.isPlaying() || !player.getPlayWhenReady()) {\n            cancelActiveRamp();\n            pauseRamping = false;\n            rampFactor = 1.0F;\n            eofFactor = 1.0F;\n            super.pause();\n            applyEffectiveVolume();\n            return;\n        }\n        if (pauseRamping) return;\n        cancelActiveRamp();\n        pauseRamping = true;\n        previousState = android.support.v4.media.session.PlaybackStateCompat.STATE_PAUSED;\n        manager.onPause();\n        manager.onStateChange(previousState);\n        final float startFactor = Math.max(0.05F, rampFactor * eofFactor);\n        final int durationMs = 200;\n        final long startTime = android.os.SystemClock.uptimeMillis();\n        activeRampTask = new Runnable() {\n            @Override\n            public void run() {\n                if (!pauseRamping) return;\n                long elapsed = android.os.SystemClock.uptimeMillis() - startTime;\n                float t = Math.min(1.0F, (float) elapsed / (float) durationMs);\n                float eased = (1.0F - t) * (1.0F - t);\n                rampFactor = startFactor * eased;\n                applyEffectiveVolume();\n                if (t < 1.0F) {\n                    rampHandler.postDelayed(this, 16);\n                } else {\n                    activeRampTask = null;\n                    pauseRamping = false;\n                    LocalPlayback.super.pause();\n                    rampFactor = 1.0F;\n                    eofFactor = 1.0F;\n                    applyEffectiveVolume();\n                }\n            }\n        };\n        rampHandler.postDelayed(activeRampTask, 16);\n    }\n\n    @Override\n    public void stop() {\n        cancelActiveRamp();\n        rampHandler.removeCallbacks(eofMonitorTask);\n        pauseRamping = false;\n        freshTrack = true;\n        rampFactor = 1.0F;\n        eofFactor = 1.0F;\n        super.stop();\n        applyEffectiveVolume();\n        prepared = false;\n    }',
  ],
  [
    playerLocalPlayback,
    '    @Override\n    public void seekTo(long time) {\n        prepare();\n        super.seekTo(time);\n    }',
    '    @Override\n    public void seekTo(long time) {\n        prepare();\n        if (softPlayPause && player.getPlayWhenReady() && !pauseRamping) {\n            cancelActiveRamp();\n            rampFactor = 0.0F;\n            pendingPlayRampMs = Math.max(pendingPlayRampMs, 200);\n            applyEffectiveVolume();\n            super.seekTo(time);\n            rampHandler.postDelayed(this::maybeStartPendingPlayRamp, 48);\n            return;\n        }\n        super.seekTo(time);\n    }',
  ],
  [
    playerLocalPlayback,
    '    @Override\n    public float getPlayerVolume() {\n        return player.getVolume();\n    }\n\n    @Override\n    public void setPlayerVolume(float volume) {\n        player.setVolume(volume);\n    }',
    '    @Override\n    public float getVolume() {\n        return userVolume;\n    }\n\n    @Override\n    public void setVolume(float volume) {\n        userVolume = Math.max(0.0F, Math.min(1.0F, volume));\n        applyEffectiveVolume();\n    }\n\n    @Override\n    public void setVolumeMultiplier(float multiplier) {\n        this.volumeMultiplier = multiplier;\n        applyEffectiveVolume();\n    }\n\n    @Override\n    public float getPlayerVolume() {\n        return userVolume * volumeMultiplier;\n    }\n\n    @Override\n    public void setPlayerVolume(float volume) {\n        if (volumeMultiplier > 0.0F) {\n            userVolume = Math.max(0.0F, Math.min(1.0F, volume / volumeMultiplier));\n        }\n        applyEffectiveVolume();\n    }',
  ],
  [
    playerLocalPlayback,
    '    @Override\n    public void destroy() {\n        super.destroy();',
    '    @Override\n    public void destroy() {\n        cancelActiveRamp();\n        rampHandler.removeCallbacks(eofMonitorTask);\n        pendingPlayRampMs = 0;\n        broadcastAudioSession(0);\n        super.destroy();',
    '    @Override\n    public void destroy() {\n        cancelActiveRamp();\n        rampHandler.removeCallbacks(eofMonitorTask);\n        broadcastAudioSession(0);\n        super.destroy();',
  ],
  // 21. MusicBinder 与 MusicModule 转发音频渐变配置与 AudioSession 查询
  [
    playerMusicBinder,
    '    private final MusicService service;\n    private final MusicManager manager;',
    '    private final MusicService service;\n    private final MusicManager manager;\n    private boolean softPlayPause = true;\n    private int crossfadeMs = 2000;',
  ],
  [
    playerMusicBinder,
    '    public void setupPlayer(Bundle bundle, Promise promise) {\n        manager.switchPlayback(manager.createLocalPlayback(bundle));\n        promise.resolve(null);\n    }',
    '    public void setupPlayer(Bundle bundle, Promise promise) {\n        ExoPlayback playback = manager.createLocalPlayback(bundle);\n        playback.setAudioTransitionConfig(softPlayPause, crossfadeMs);\n        manager.switchPlayback(playback);\n        promise.resolve(null);\n    }',
  ],
  [
    playerMusicBinder,
    '    public void setFavoriteState(boolean favorite) {\n        manager.getMetadata().setFavorite(favorite);\n    }',
    '    public void setFavoriteState(boolean favorite) {\n        manager.getMetadata().setFavorite(favorite);\n    }\n\n    public void setAudioTransitionConfig(boolean softPlayPause, int crossfadeMs) {\n        this.softPlayPause = softPlayPause;\n        this.crossfadeMs = crossfadeMs;\n        ExoPlayback playback = manager.getPlayback();\n        if (playback != null) playback.setAudioTransitionConfig(softPlayPause, crossfadeMs);\n    }\n\n    public int getAudioSessionId() {\n        ExoPlayback playback = manager.getPlayback();\n        return playback != null ? playback.getAudioSessionId() : 0;\n    }',
  ],
  [
    playerMusicModule,
    '    private Bundle options;\n    private boolean favoriteState = false;',
    '    private Bundle options;\n    private boolean favoriteState = false;\n    private boolean softPlayPause = true;\n    private int crossfadeMs = 2000;',
  ],
  [
    playerMusicModule,
    '        binder.setFavoriteState(favoriteState);',
    '        binder.setFavoriteState(favoriteState);\n        binder.setAudioTransitionConfig(softPlayPause, crossfadeMs);',
  ],
  [
    playerMusicModule,
    '    @ReactMethod\n    public void setFavoriteState(final boolean favorite, final Promise callback) {',
    '    @ReactMethod\n    public void setAudioTransitionConfig(final boolean softPlayPause, final int crossfadeMs, final Promise callback) {\n        this.softPlayPause = softPlayPause;\n        this.crossfadeMs = crossfadeMs;\n        if (binder != null) {\n            binder.post(() -> {\n                if (binder != null) binder.setAudioTransitionConfig(softPlayPause, crossfadeMs);\n                callback.resolve(null);\n            });\n        } else {\n            callback.resolve(null);\n        }\n    }\n\n    @ReactMethod\n    public void getAudioSessionId(final Promise callback) {\n        if (binder == null) {\n            callback.resolve(0);\n        } else {\n            binder.post(() -> callback.resolve(binder != null ? binder.getAudioSessionId() : 0));\n        }\n    }\n\n    @ReactMethod\n    public void setFavoriteState(final boolean favorite, final Promise callback) {',
  ],
  // 22. 桌面小组件原生双向联动（MusicService 控播动作 + MetadataManager 实时状态与封面同步）
  [
    playerMusicService,
    '            emit(MusicEvents.BUTTON_TOGGLE_FAVORITE, null);\n            return START_NOT_STICKY;\n        }',
    '            emit(MusicEvents.BUTTON_TOGGLE_FAVORITE, null);\n            return START_NOT_STICKY;\n        }\n\n        if(intent != null && intent.getAction() != null && intent.getAction().startsWith("xmusic_widget_")) {\n            if (manager == null) {\n                onStartForeground();\n                return START_NOT_STICKY;\n            }\n            String act = intent.getAction();\n            if ("xmusic_widget_play_pause".equals(act)) {\n                boolean playing = manager.getPlayback() != null && manager.getPlayback().getState() == android.support.v4.media.session.PlaybackStateCompat.STATE_PLAYING;\n                emit(playing ? MusicEvents.BUTTON_PAUSE : MusicEvents.BUTTON_PLAY, null);\n            } else if ("xmusic_widget_prev".equals(act)) {\n                emit(MusicEvents.BUTTON_SKIP_PREVIOUS, null);\n            } else if ("xmusic_widget_next".equals(act)) {\n                emit(MusicEvents.BUTTON_SKIP_NEXT, null);\n            }\n            return START_NOT_STICKY;\n        }',
  ],
  [
    playerMetadata,
    '    private boolean isFavorite = false;\n    private boolean lastPlaying = false;',
    '    private boolean isFavorite = false;\n    private boolean lastPlaying = false;\n    private String lastWidgetTitle = "";\n    private String lastWidgetArtist = "";\n\n    private void broadcastWidgetState() {\n        try {\n            Intent intent = new Intent("com.startips.xmusic.WIDGET_STATE_CHANGED");\n            intent.setPackage(service.getPackageName());\n            intent.putExtra("title", lastWidgetTitle);\n            intent.putExtra("artist", lastWidgetArtist);\n            intent.putExtra("isPlaying", lastPlaying);\n            intent.putExtra("isFavorite", isFavorite);\n            service.sendBroadcast(intent);\n        } catch (Exception ignored) {}\n    }\n\n    private void persistWidgetArtworkAsync(final Bitmap src) {\n        if (src == null || src.isRecycled()) return;\n        try {\n            final Bitmap scaled = Bitmap.createScaledBitmap(src, 192, 192, true);\n            new Thread(() -> {\n                try {\n                    java.io.File out = new java.io.File(service.getCacheDir(), "widget_cover.png");\n                    try (java.io.FileOutputStream fos = new java.io.FileOutputStream(out)) {\n                        scaled.compress(Bitmap.CompressFormat.PNG, 92, fos);\n                    }\n                    broadcastWidgetState();\n                } catch (Exception ignored) {\n                } finally {\n                    if (scaled != src && !scaled.isRecycled()) scaled.recycle();\n                }\n            }).start();\n        } catch (Exception ignored) {}\n    }',
  ],
  [
    playerMetadata,
    '                        session.setMetadata(metadata.build());\n                        updateNotification();\n                    }\n\n                    @Override\n                    public void onLoadCleared',
    '                        session.setMetadata(metadata.build());\n                        updateNotification();\n                        persistWidgetArtworkAsync(resource);\n                    }\n\n                    @Override\n                    public void onLoadCleared',
  ],
  [
    playerMetadata,
    '        builder.setContentTitle(track.title);\n        builder.setContentText(track.artist);\n        builder.setSubText(track.album);',
    '        this.lastWidgetTitle = track.title != null ? track.title : "";\n        this.lastWidgetArtist = track.artist != null ? track.artist : "";\n        builder.setContentTitle(track.title);\n        builder.setContentText(track.artist);\n        builder.setSubText(track.album);',
  ],
  [
    playerMetadata,
    '    public void updatePlayback(boolean playing) {\n        this.lastPlaying = playing;\n        List<Integer> compact = new ArrayList<>();',
    '    public void updatePlayback(boolean playing) {\n        this.lastPlaying = playing;\n        broadcastWidgetState();\n        List<Integer> compact = new ArrayList<>();',
  ],
  // 23. 横屏四边沉浸：清零 ComponentViewController 传递给页面根容器的左右系统栏/挖孔 inset，由页面自身按安全区避让内容
  [
    rnnComponentViewController,
    '        WindowInsetsCompat finalInsets = new WindowInsetsCompat.Builder()\n                .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime(),\n                        Insets.of(systemBarsInsets.left,\n                                systemWindowInsetTop,\n                                systemBarsInsets.right,\n                                Math.max(systemWindowInsetBottom - getBottomInset(), 0)))\n                .build();',
    '        WindowInsetsCompat finalInsets = new WindowInsetsCompat.Builder()\n                .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime(),\n                        Insets.of(0,\n                                systemWindowInsetTop,\n                                0,\n                                Math.max(systemWindowInsetBottom - getBottomInset(), 0)))\n                .build();',
  ],
  // 24. MusicManager 挂载内置 32-bit Float DSP 音频处理器，并在恢复播放时通知 PCM 样本级静音包络
  [
    playerMusicManager,
    '        DefaultRenderersFactory renderersFactory = new DefaultRenderersFactory(service);',
    '        DefaultRenderersFactory renderersFactory = new DefaultRenderersFactory(service) {\n            @Override\n            protected androidx.media3.exoplayer.audio.AudioSink buildAudioSink(\n                    Context context, boolean enableFloatOutput, boolean enableAudioTrackPlaybackParams) {\n                return new androidx.media3.exoplayer.audio.DefaultAudioSink.Builder(context)\n                        .setEnableFloatOutput(enableFloatOutput)\n                        .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)\n                        .setAudioProcessors(new androidx.media3.common.audio.AudioProcessor[]{\n                                com.guichaguri.trackplayer.service.player.XmusicDspAudioProcessor.getInstance()\n                        })\n                        .build();\n            }\n        };',
  ],
  [
    playerLocalPlayback,
    '        rampFactor = 0.0F;\n        pendingPlayRampMs = durationMs;\n        applyEffectiveVolume();\n        super.play();\n        maybeStartPendingPlayRamp();',
    '        rampFactor = 0.0F;\n        pendingPlayRampMs = durationMs;\n        applyEffectiveVolume();\n        XmusicDspAudioProcessor.getInstance().notifyPlayResume();\n        super.play();\n        maybeStartPendingPlayRamp();',
  ],
  // 25. 修复 RNN 共享元素入场过渡卡死（ReactImageView/FadeImageView 已有宽高但 isLaidOut=false 时不再无限挂起导致播放页透明不可见）
  [
    rnnExistingViewFinder,
    '            is ImageView -> {\n                if (hasMeasuredDrawable(view)) {\n                    resume(view, cont)\n                } else {\n                    resumeOnImageLoad(view, cont)\n                }\n            }\n            else -> cont.resume(view)\n        }\n    }\n\n    private fun resume(view: ImageView, cont: Continuation<View?>) {\n        if (view.drawable is RootDrawable) {\n            view.post { cont.resume(view) }\n        } else {\n            cont.resume(view)\n        }\n    }\n\n    private fun resumeOnImageLoad(view: ImageView, cont: Continuation<View?>) {\n        view.doOnPreDraw {\n            if (hasMeasuredDrawable(view)) {\n                view.post {\n                    cont.resume(view)\n                }\n            } else {\n                resumeOnImageLoad(view, cont)\n            }\n        }\n    }\n\n    private fun hasMeasuredDrawable(view: ImageView) = when (view.drawable) {\n        is RootDrawable -> true\n        else -> checkIfFastImageIsMeasured(view)\n    }',
    '            is ImageView -> {\n                if (hasMeasuredDrawable(view)) {\n                    resume(view, cont)\n                } else {\n                    resumeOnImageLoad(view, cont, 0)\n                }\n            }\n            else -> cont.resume(view)\n        }\n    }\n\n    private fun resume(view: ImageView, cont: Continuation<View?>) {\n        if (view.drawable is RootDrawable) {\n            view.post { cont.resume(view) }\n        } else {\n            cont.resume(view)\n        }\n    }\n\n    private fun resumeOnImageLoad(view: ImageView, cont: Continuation<View?>, attempt: Int) {\n        if (!view.isAttachedToWindow || attempt >= 12) {\n            cont.resume(if (view.width > 0 && view.height > 0) view else null)\n            return\n        }\n        view.doOnPreDraw {\n            if (hasMeasuredDrawable(view)) {\n                view.post {\n                    cont.resume(view)\n                }\n            } else {\n                resumeOnImageLoad(view, cont, attempt + 1)\n            }\n        }\n    }\n\n    private fun hasMeasuredDrawable(view: ImageView) = when (view.drawable) {\n        is RootDrawable -> view.width > 0 && view.height > 0\n        else -> checkIfFastImageIsMeasured(view)\n    }',
    '            is ImageView -> {\n                if (hasMeasuredDrawable(view)) {\n                    resume(view, cont)\n                } else {\n                    resumeOnImageLoad(view, cont)\n                }\n            }\n            else -> cont.resume(view)\n        }\n    }\n\n    private fun resume(view: ImageView, cont: Continuation<View?>) {\n        if (view.drawable is RootDrawable) {\n            view.post { cont.resume(view) }\n        } else {\n            cont.resume(view)\n        }\n    }\n\n    private fun resumeOnImageLoad(view: ImageView, cont: Continuation<View?>) {\n        view.doOnPreDraw {\n            if (hasMeasuredDrawable(view)) {\n                view.post {\n                    cont.resume(view)\n                }\n            } else {\n                resumeOnImageLoad(view, cont)\n            }\n        }\n    }\n\n    private fun hasMeasuredDrawable(view: ImageView) = when (view.drawable) {\n        is RootDrawable -> view.isLaidOut && view.width > 0 && view.height > 0\n        else -> checkIfFastImageIsMeasured(view)\n    }',
  ],
  [
    rnnStackAnimator,
    '        appearing.awaitRender()\n        val fade = if (options.animations.push.content.enter.isFadeAnimation()) options.animations.push.content.enter else FadeAnimation.content.enter\n        val transitionAnimators = transitionAnimatorCreator.create(options.animations.push, fade, disappearing, appearing)\n        set.playTogether(fade.getAnimation(appearing.view), transitionAnimators)\n        transitionAnimators.listeners.forEach { listener: Animator.AnimatorListener -> set.addListener(listener) }\n        transitionAnimators.removeAllListeners()\n        set.start()',
    '        appearing.awaitRender()\n        if (appearing.isDestroyed || !runningPushAnimations.containsKey(appearing)) return@launch\n        val fade = if (options.animations.push.content.enter.isFadeAnimation()) options.animations.push.content.enter else FadeAnimation.content.enter\n        val transitionAnimators = transitionAnimatorCreator.create(options.animations.push, fade, disappearing, appearing)\n        if (appearing.isDestroyed || !runningPushAnimations.containsKey(appearing)) return@launch\n        set.playTogether(fade.getAnimation(appearing.view), transitionAnimators)\n        transitionAnimators.listeners.forEach { listener: Animator.AnimatorListener -> set.addListener(listener) }\n        transitionAnimators.removeAllListeners()\n        set.doOnEnd {\n            if (!appearing.isDestroyed) appearing.view.alpha = 1f\n        }\n        set.start()',
  ],
]

const dspConfigSource = `package com.guichaguri.trackplayer.service.player;

/**
 * Pure Java thread-safe DSP parameter store shared across app React bridge and ExoPlayer audio thread.
 */
public final class XmusicDspConfig {
    public static final int[] CENTER_FREQS_HZ = new int[]{60, 230, 910, 3600, 14000};
    public static final int NUM_EQ_BANDS = 5;

    private static final Object LOCK = new Object();
    private static boolean enabled = false;
    private static final int[] bandsMb = new int[]{0, 0, 0, 0, 0};
    private static int bassStrength = 0;
    private static int loudnessGainMb = 0;
    private static volatile int configVersion = 1;

    private XmusicDspConfig() {}

    public static void updateConfig(boolean isEnabled, int[] nextBandsMb, int nextBassStrength, int nextLoudnessGainMb) {
        synchronized (LOCK) {
            enabled = isEnabled;
            for (int i = 0; i < NUM_EQ_BANDS; i++) {
                int v = (nextBandsMb != null && i < nextBandsMb.length) ? nextBandsMb[i] : 0;
                bandsMb[i] = Math.max(-1500, Math.min(1500, v));
            }
            bassStrength = Math.max(0, Math.min(1000, nextBassStrength));
            loudnessGainMb = Math.max(0, Math.min(1200, nextLoudnessGainMb));
            configVersion++;
        }
    }

    public static int getConfigVersion() {
        return configVersion;
    }

    public static boolean isEnabled() {
        synchronized (LOCK) {
            return enabled;
        }
    }

    public static int copySnapshot(int[] bandsOut, int[] extraOut) {
        synchronized (LOCK) {
            if (bandsOut != null) {
                System.arraycopy(bandsMb, 0, bandsOut, 0, Math.min(bandsOut.length, NUM_EQ_BANDS));
            }
            if (extraOut != null && extraOut.length >= 3) {
                extraOut[0] = enabled ? 1 : 0;
                extraOut[1] = bassStrength;
                extraOut[2] = loudnessGainMb;
            }
            return configVersion;
        }
    }
}
`

const dspProcessorSource = `package com.guichaguri.trackplayer.service.player;

import androidx.media3.common.C;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.audio.BaseAudioProcessor;
import androidx.media3.common.util.UnstableApi;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * In-engine 64-bit internal / 32-bit float DSP processor for ExoPlayer DefaultAudioSink.
 * Runs parametric 5-band EQ, low-shelf bass boost, loudness gain, soft-knee limiter,
 * and sample-accurate silence pre-roll + raised-cosine fade-in directly in PCM stream,
 * completely eliminating Android HAL/NXP AudioEffect cold-start and seek pops.
 */
@UnstableApi
public final class XmusicDspAudioProcessor extends BaseAudioProcessor {
    private static final int NUM_EQ_BANDS = XmusicDspConfig.NUM_EQ_BANDS;
    private static final int NUM_STAGES = 6; // 5 peaking EQ bands + 1 low-shelf bass boost
    private static final int MAX_CHANNELS = 8;
    private static final double PEAKING_Q = 0.85;
    private static final double BASS_SHELF_HZ = 85.0;
    private static final double BASS_SHELF_Q = 0.7071067811865476;

    private static final XmusicDspAudioProcessor INSTANCE = new XmusicDspAudioProcessor();

    public static XmusicDspAudioProcessor getInstance() {
        return INSTANCE;
    }

    private volatile boolean pendingResumeRamp = false;

    // Audio-thread-only DSP state
    private int appliedConfigVersion = -1;
    private int appliedSampleRate = 0;
    private boolean localEnabled = false;
    private final int[] localBandsSnapshot = new int[NUM_EQ_BANDS];
    private final int[] localExtraSnapshot = new int[3];
    private double loudnessLinear = 1.0;

    private final double[] b0 = new double[NUM_STAGES];
    private final double[] b1 = new double[NUM_STAGES];
    private final double[] b2 = new double[NUM_STAGES];
    private final double[] a1 = new double[NUM_STAGES];
    private final double[] a2 = new double[NUM_STAGES];
    private final boolean[] stageActive = new boolean[NUM_STAGES];
    private final double[][] z1 = new double[NUM_STAGES][MAX_CHANNELS];
    private final double[][] z2 = new double[NUM_STAGES][MAX_CHANNELS];

    private float wetMix = 0.0f;
    private int prerollFramesRemaining = 0;
    private int rampTotalFrames = 0;
    private int rampFramesDone = 0;

    private XmusicDspAudioProcessor() {
        for (int s = 0; s < NUM_STAGES; s++) {
            b0[s] = 1.0;
        }
    }

    public void notifyPlayResume() {
        pendingResumeRamp = true;
    }

    private void zeroDelayLines() {
        for (int s = 0; s < NUM_STAGES; s++) {
            for (int c = 0; c < MAX_CHANNELS; c++) {
                z1[s][c] = 0.0;
                z2[s][c] = 0.0;
            }
        }
    }

    private void setIdentityStage(int s) {
        b0[s] = 1.0;
        b1[s] = 0.0;
        b2[s] = 0.0;
        a1[s] = 0.0;
        a2[s] = 0.0;
        stageActive[s] = false;
    }

    private void rebuildCoeffsIfNeeded(int sampleRate) {
        int ver = XmusicDspConfig.getConfigVersion();
        if (appliedConfigVersion == ver && appliedSampleRate == sampleRate) {
            return;
        }
        ver = XmusicDspConfig.copySnapshot(localBandsSnapshot, localExtraSnapshot);
        boolean en = localExtraSnapshot[0] != 0;
        int bass = localExtraSnapshot[1];
        int loud = localExtraSnapshot[2];

        if (!localEnabled && en && wetMix <= 0.001f && prerollFramesRemaining <= 0) {
            zeroDelayLines();
        }

        localEnabled = en;
        appliedSampleRate = sampleRate;
        appliedConfigVersion = ver;

        if (!en || sampleRate < 20000) {
            for (int s = 0; s < NUM_STAGES; s++) {
                setIdentityStage(s);
            }
            loudnessLinear = 1.0;
            return;
        }

        for (int i = 0; i < NUM_EQ_BANDS; i++) {
            int mb = localBandsSnapshot[i];
            double freq = XmusicDspConfig.CENTER_FREQS_HZ[i];
            if (Math.abs(mb) < 5 || freq >= sampleRate * 0.45) {
                setIdentityStage(i);
                continue;
            }
            double gainDb = mb / 100.0;
            double amp = Math.pow(10.0, gainDb / 40.0);
            double w0 = (2.0 * Math.PI * freq) / sampleRate;
            double cosW0 = Math.cos(w0);
            double alpha = Math.sin(w0) / (2.0 * PEAKING_Q);
            double a0 = 1.0 + alpha / amp;
            b0[i] = (1.0 + alpha * amp) / a0;
            b1[i] = (-2.0 * cosW0) / a0;
            b2[i] = (1.0 - alpha * amp) / a0;
            a1[i] = b1[i];
            a2[i] = (1.0 - alpha / amp) / a0;
            stageActive[i] = true;
        }

        if (bass <= 0 || BASS_SHELF_HZ >= sampleRate * 0.45) {
            setIdentityStage(5);
        } else {
            double gainDb = (bass / 1000.0) * 9.0;
            double amp = Math.pow(10.0, gainDb / 40.0);
            double w0 = (2.0 * Math.PI * BASS_SHELF_HZ) / sampleRate;
            double cosW0 = Math.cos(w0);
            double sinW0 = Math.sin(w0);
            double twoSqrtAAlpha = 2.0 * Math.sqrt(amp) * (sinW0 / (2.0 * BASS_SHELF_Q));
            double a0 = (amp + 1.0) + (amp - 1.0) * cosW0 + twoSqrtAAlpha;
            b0[5] = (amp * ((amp + 1.0) - (amp - 1.0) * cosW0 + twoSqrtAAlpha)) / a0;
            b1[5] = (2.0 * amp * ((amp - 1.0) - (amp + 1.0) * cosW0)) / a0;
            b2[5] = (amp * ((amp + 1.0) - (amp - 1.0) * cosW0 - twoSqrtAAlpha)) / a0;
            a1[5] = (-2.0 * ((amp - 1.0) + (amp + 1.0) * cosW0)) / a0;
            a2[5] = ((amp + 1.0) + (amp - 1.0) * cosW0 - twoSqrtAAlpha) / a0;
            stageActive[5] = true;
        }

        loudnessLinear = loud > 0 ? Math.pow(10.0, loud / 2000.0) : 1.0;
    }

    @Override
    protected AudioFormat onConfigure(AudioFormat inputAudioFormat) throws UnhandledAudioFormatException {
        if (inputAudioFormat.channelCount < 1
                || inputAudioFormat.channelCount > MAX_CHANNELS
                || inputAudioFormat.sampleRate <= 0) {
            return AudioFormat.NOT_SET;
        }
        int enc = inputAudioFormat.encoding;
        if (enc != C.ENCODING_PCM_16BIT
                && enc != C.ENCODING_PCM_24BIT
                && enc != C.ENCODING_PCM_32BIT
                && enc != C.ENCODING_PCM_FLOAT) {
            return AudioFormat.NOT_SET;
        }
        return inputAudioFormat;
    }

    @Override
    protected void onFlush() {
        zeroDelayLines();
        appliedConfigVersion = -1;
        appliedSampleRate = 0;
        boolean initEnabled = XmusicDspConfig.isEnabled();
        localEnabled = initEnabled;
        wetMix = initEnabled ? 1.0f : 0.0f;

        int sr = this.inputAudioFormat.sampleRate > 0 ? this.inputAudioFormat.sampleRate : 44100;
        prerollFramesRemaining = (sr * 28) / 1000;
        rampTotalFrames = Math.max(1, (sr * 180) / 1000);
        rampFramesDone = 0;
        pendingResumeRamp = false;
    }

    @Override
    protected void onReset() {
        zeroDelayLines();
        appliedConfigVersion = -1;
        appliedSampleRate = 0;
        wetMix = 0.0f;
        prerollFramesRemaining = 0;
        rampTotalFrames = 0;
        rampFramesDone = 0;
        pendingResumeRamp = false;
    }

    @Override
    public void queueInput(ByteBuffer inputBuffer) {
        int remaining = inputBuffer.remaining();
        if (remaining == 0) {
            return;
        }

        AudioFormat fmt = this.inputAudioFormat;
        int sr = fmt.sampleRate;
        int chCount = fmt.channelCount;
        int bytesPerFrame = fmt.bytesPerFrame;
        if (sr <= 0 || chCount <= 0 || chCount > MAX_CHANNELS || bytesPerFrame <= 0) {
            inputBuffer.position(inputBuffer.limit());
            return;
        }

        inputBuffer.order(ByteOrder.nativeOrder());
        int frames = remaining / bytesPerFrame;
        if (frames <= 0) {
            inputBuffer.position(inputBuffer.limit());
            return;
        }

        // Mute low-rate placeholder audio (11025 Hz defaultUrl) completely to digital zeros
        if (sr < 20000) {
            ByteBuffer outZero = replaceOutputBuffer(remaining);
            for (int i = 0; i < remaining; i++) {
                outZero.put((byte) 0);
            }
            inputBuffer.position(inputBuffer.limit());
            outZero.flip();
            return;
        }

        rebuildCoeffsIfNeeded(sr);

        if (pendingResumeRamp) {
            pendingResumeRamp = false;
            int minPreroll = (sr * 16) / 1000;
            int minRamp = Math.max(1, (sr * 140) / 1000);
            if (prerollFramesRemaining < minPreroll) {
                prerollFramesRemaining = minPreroll;
            }
            if (rampFramesDone >= rampTotalFrames || rampTotalFrames < minRamp) {
                rampTotalFrames = minRamp;
                rampFramesDone = 0;
            }
        }

        if (!localEnabled
                && wetMix <= 0.0001f
                && prerollFramesRemaining <= 0
                && rampFramesDone >= rampTotalFrames) {
            wetMix = 0.0f;
            ByteBuffer outPass = replaceOutputBuffer(remaining);
            outPass.put(inputBuffer);
            outPass.flip();
            return;
        }

        ByteBuffer out = replaceOutputBuffer(remaining);
        float targetWet = localEnabled ? 1.0f : 0.0f;
        float wetStep = 1.0f / Math.max(64.0f, sr * 0.035f);
        int encoding = fmt.encoding;

        for (int f = 0; f < frames; f++) {
            if (wetMix < targetWet) {
                wetMix = Math.min(targetWet, wetMix + wetStep);
            } else if (wetMix > targetWet) {
                wetMix = Math.max(targetWet, wetMix - wetStep);
            }

            double env;
            if (prerollFramesRemaining > 0) {
                prerollFramesRemaining--;
                env = 0.0;
            } else if (rampFramesDone < rampTotalFrames) {
                rampFramesDone++;
                double p = (double) rampFramesDone / (double) rampTotalFrames;
                env = 0.5 * (1.0 - Math.cos(Math.PI * p));
            } else {
                env = 1.0;
            }

            boolean runDsp = wetMix > 0.0001f || (localEnabled && env == 0.0);

            for (int c = 0; c < chCount; c++) {
                double x;
                switch (encoding) {
                    case C.ENCODING_PCM_16BIT:
                        x = inputBuffer.getShort() / 32768.0;
                        break;
                    case C.ENCODING_PCM_24BIT: {
                        int b0Byte = inputBuffer.get() & 0xFF;
                        int b1Byte = inputBuffer.get() & 0xFF;
                        int b2Byte = inputBuffer.get();
                        int s24 = b0Byte | (b1Byte << 8) | (b2Byte << 16);
                        x = s24 / 8388608.0;
                        break;
                    }
                    case C.ENCODING_PCM_32BIT:
                        x = inputBuffer.getInt() / 2147483648.0;
                        break;
                    case C.ENCODING_PCM_FLOAT:
                    default:
                        x = inputBuffer.getFloat();
                        break;
                }

                double sample;
                if (runDsp) {
                    double wet = x;
                    for (int s = 0; s < NUM_STAGES; s++) {
                        if (!stageActive[s]) continue;
                        double v = b0[s] * wet + z1[s][c];
                        double nz1 = b1[s] * wet - a1[s] * v + z2[s][c];
                        double nz2 = b2[s] * wet - a2[s] * v;
                        if (Double.isNaN(v) || Double.isInfinite(v)) {
                            z1[s][c] = 0.0;
                            z2[s][c] = 0.0;
                            v = wet;
                        } else {
                            z1[s][c] = nz1;
                            z2[s][c] = nz2;
                        }
                        wet = v;
                    }
                    wet *= loudnessLinear;
                    double absW = Math.abs(wet);
                    if (absW > 0.85) {
                        double excess = (absW - 0.85) / 0.15;
                        double limited = 0.85 + 0.15 * Math.tanh(excess);
                        wet = wet >= 0.0 ? limited : -limited;
                    }
                    sample = x + (wet - x) * wetMix;
                } else {
                    sample = x;
                }

                double y = sample * env;
                if (y > 1.0) y = 1.0;
                else if (y < -1.0) y = -1.0;

                switch (encoding) {
                    case C.ENCODING_PCM_16BIT:
                        out.putShort((short) Math.max(-32768, Math.min(32767, Math.round(y * 32767.0))));
                        break;
                    case C.ENCODING_PCM_24BIT: {
                        int o24 = (int) Math.max(-8388608L, Math.min(8388607L, Math.round(y * 8388607.0)));
                        out.put((byte) (o24 & 0xFF));
                        out.put((byte) ((o24 >> 8) & 0xFF));
                        out.put((byte) ((o24 >> 16) & 0xFF));
                        break;
                    }
                    case C.ENCODING_PCM_32BIT:
                        out.putInt((int) Math.max(-2147483648L, Math.min(2147483647L, Math.round(y * 2147483647.0))));
                        break;
                    case C.ENCODING_PCM_FLOAT:
                    default:
                        out.putFloat((float) y);
                        break;
                }
            }
        }

        if (inputBuffer.hasRemaining()) {
            while (inputBuffer.hasRemaining()) {
                out.put(inputBuffer.get());
            }
        }
        out.flip();
    }
}
`

;(async() => {
  let hasError = false
  for (const [targetPath, targetSource] of [
    [playerDspConfig, dspConfigSource],
    [playerDspProcessor, dspProcessorSource],
  ]) {
    console.log(`Syncing ${targetPath.replace(rootPath, '')}`)
    try {
      let existing = null
      try {
        existing = (await fs.promises.readFile(targetPath)).toString().replace(/\r\n/g, '\n')
      } catch {}
      if (existing === targetSource) {
        console.log('  already patched, skip')
      } else {
        await fs.promises.writeFile(targetPath, targetSource)
      }
    } catch (err) {
      hasError = true
      console.error(`Write ${targetPath.replace(rootPath, '')} failed: ${err.message}`)
    }
  }
  for (const [filePath, fromStr, toStr, legacyPatchedStr] of patchs) {
    console.log(`Patching ${filePath.replace(rootPath, '')}`)
    try {
      const raw = (await fs.promises.readFile(filePath)).toString()
      const file = raw.replace(/\r\n/g, '\n')
      if (file.includes(toStr) ||
        (filePath === playerMetadata && fromStr.includes('METADATA_KEY_ARTIST') && file.includes('METADATA_KEY_ART;')) ||
        (filePath === playerMetadata && fromStr.includes('artworkTarget = null;') && file.includes('persistWidgetArtworkAsync')) ||
        (filePath === playerMetadata && fromStr.includes('private Action previousAction') && file.includes('ACTION_TOGGLE_FAVORITE')) ||
        (filePath === playerMetadata && fromStr.includes('builder.mActions.clear();') && file.includes('this.lastPlaying = playing;')) ||
        (filePath === playerMetadata && fromStr.includes('private boolean isFavorite = false;\n    private boolean lastPlaying = false;') && file.includes('private String lastWidgetTitle = "";')) ||
        (filePath === playerMetadata && fromStr.includes('builder.setContentTitle(track.title);') && file.includes('this.lastWidgetTitle = track.title')) ||
        (filePath === playerMetadata && fromStr.includes('this.lastPlaying = playing;\n        List<Integer> compact') && file.includes('this.lastPlaying = playing;\n        broadcastWidgetState();')) ||
        (filePath === playerMusicService && fromStr.includes('public int onStartCommand') && file.includes('ACTION_TOGGLE_FAVORITE')) ||
        (filePath === playerMusicService && fromStr.includes('emit(MusicEvents.BUTTON_TOGGLE_FAVORITE, null);') && file.includes('startsWith("xmusic_widget_")')) ||
        (filePath === playerMusicBinder && fromStr.includes('private final MusicService service;') && file.includes('private boolean softPlayPause = true;')) ||
        (filePath === playerMusicModule && fromStr.includes('ReactApplicationContext reactAppContext;') && file.includes('private boolean favoriteState = false;')) ||
        (filePath === playerLocalPlayback && fromStr.includes('public void play()') && file.includes('notifyPlayResume()'))
      ) {
        console.log('  already patched, skip')
        continue
      }
      if (legacyPatchedStr && file.includes(legacyPatchedStr)) {
        const upgraded = legacyPatchedStr.includes('public void setFavorite(boolean favorite)')
          ? file.replace(
            legacyPatchedStr,
            '    public void setFavorite(boolean favorite) {\n        if (this.isFavorite == favorite) return;\n        this.isFavorite = favorite;\n        ExoPlayback playback = manager.getPlayback();\n        if (playback != null) {\n            updatePlayback(lastPlaying);\n            updatePlaybackState(playback);\n            updateNotification();\n        }\n    }',
          )
          : file.replace(legacyPatchedStr, toStr)
        await fs.promises.writeFile(filePath, upgraded)
        console.log('  upgraded existing patch')
        continue
      }
      if (file.includes(fromStr)) {
        await fs.promises.writeFile(filePath, file.replace(fromStr, toStr))
        continue
      }
      throw new Error('target snippet not found')
    } catch (err) {
      hasError = true
      console.error(`Patch ${filePath.replace(rootPath, '')} failed: ${err.message}`)
    }
  }
  console.log('\nDependencies patch finished.\n')
  if (hasError) process.exit(1)
})()
