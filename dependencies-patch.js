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
const rnnSystemUiUtils = path.join(
  rootPath,
  'node_modules/react-native-navigation/lib/android/app/src/main/java/com/reactnativenavigation/utils/SystemUiUtils.kt',
)
const rnnPresenter = path.join(
  rootPath,
  'node_modules/react-native-navigation/lib/android/app/src/main/java/com/reactnativenavigation/viewcontrollers/viewcontroller/Presenter.java',
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
    '    private void cancelActiveRamp() {\n        if (activeRampTask != null) {\n            rampHandler.removeCallbacks(activeRampTask);\n            activeRampTask = null;\n        }\n    }\n\n    private void applyEffectiveVolume() {\n        float effective = Math.max(0.0F, Math.min(1.0F, userVolume * volumeMultiplier * rampFactor * eofFactor));\n        player.setVolume(effective);\n    }\n\n    private void broadcastAudioSession(int sessionId) {\n        try {\n            android.content.Intent intent = new android.content.Intent("com.startips.xmusic.AUDIO_SESSION_CHANGED");\n            intent.setPackage(context.getPackageName());\n            intent.putExtra("audioSessionId", sessionId);\n            context.sendBroadcast(intent);\n        } catch (Exception ignored) {}\n    }\n\n    @Override\n    public int getAudioSessionId() {\n        return player.getAudioSessionId();\n    }\n\n    @Override\n    public void onAudioSessionIdChanged(int audioSessionId) {\n        broadcastAudioSession(audioSessionId);\n    }\n\n    @Override\n    public void setAudioTransitionConfig(boolean softPlayPause, int crossfadeMs) {\n        this.softPlayPause = softPlayPause;\n        this.crossfadeMs = Math.max(0, Math.min(crossfadeMs, 6000));\n        if (this.crossfadeMs <= 0 && eofFactor != 1.0F) {\n            eofFactor = 1.0F;\n            applyEffectiveVolume();\n        } else if (this.crossfadeMs > 0 && player.isPlaying() && !pauseRamping) {\n            rampHandler.post(eofMonitorTask);\n        }\n    }\n\n    @Override\n    protected boolean isPauseRamping() {\n        return pauseRamping;\n    }\n\n    @Override\n    public void skip(int index, Promise promise) {\n        cancelActiveRamp();\n        pauseRamping = false;\n        freshTrack = true;\n        eofFactor = 1.0F;\n        rampFactor = 1.0F;\n        super.skip(index, promise);\n    }\n\n    @Override\n    public void play() {\n        cancelActiveRamp();\n        boolean wasPauseRamping = pauseRamping;\n        pauseRamping = false;\n        eofFactor = 1.0F;\n        prepare();\n        boolean useTrackFadeIn = freshTrack && crossfadeMs > 0;\n        freshTrack = false;\n        final int durationMs = useTrackFadeIn ? Math.min(crossfadeMs, 1400) : (softPlayPause ? 220 : 0);\n        if (durationMs <= 0) {\n            rampFactor = 1.0F;\n            applyEffectiveVolume();\n            super.play();\n            if (crossfadeMs > 0) rampHandler.postDelayed(eofMonitorTask, 120);\n            return;\n        }\n        final float startFactor = wasPauseRamping ? Math.max(0.04F, rampFactor) : (player.isPlaying() ? Math.max(0.08F, rampFactor) : 0.04F);\n        rampFactor = startFactor;\n        applyEffectiveVolume();\n        super.play();\n        final long startTime = android.os.SystemClock.uptimeMillis();\n        activeRampTask = new Runnable() {\n            @Override\n            public void run() {\n                long elapsed = android.os.SystemClock.uptimeMillis() - startTime;\n                float t = Math.min(1.0F, (float) elapsed / (float) durationMs);\n                float eased = 1.0F - (1.0F - t) * (1.0F - t) * (1.0F - t);\n                rampFactor = startFactor + (1.0F - startFactor) * eased;\n                applyEffectiveVolume();\n                if (t < 1.0F) {\n                    rampHandler.postDelayed(this, 16);\n                } else {\n                    activeRampTask = null;\n                }\n            }\n        };\n        rampHandler.postDelayed(activeRampTask, 16);\n        if (crossfadeMs > 0) rampHandler.postDelayed(eofMonitorTask, 120);\n    }\n\n    @Override\n    public void pause() {\n        rampHandler.removeCallbacks(eofMonitorTask);\n        if (!softPlayPause || !player.isPlaying() || !player.getPlayWhenReady()) {\n            cancelActiveRamp();\n            pauseRamping = false;\n            rampFactor = 1.0F;\n            eofFactor = 1.0F;\n            super.pause();\n            applyEffectiveVolume();\n            return;\n        }\n        if (pauseRamping) return;\n        cancelActiveRamp();\n        pauseRamping = true;\n        previousState = android.support.v4.media.session.PlaybackStateCompat.STATE_PAUSED;\n        manager.onPause();\n        manager.onStateChange(previousState);\n        final float startFactor = Math.max(0.05F, rampFactor * eofFactor);\n        final int durationMs = 200;\n        final long startTime = android.os.SystemClock.uptimeMillis();\n        activeRampTask = new Runnable() {\n            @Override\n            public void run() {\n                if (!pauseRamping) return;\n                long elapsed = android.os.SystemClock.uptimeMillis() - startTime;\n                float t = Math.min(1.0F, (float) elapsed / (float) durationMs);\n                float eased = (1.0F - t) * (1.0F - t);\n                rampFactor = startFactor * eased;\n                applyEffectiveVolume();\n                if (t < 1.0F) {\n                    rampHandler.postDelayed(this, 16);\n                } else {\n                    activeRampTask = null;\n                    pauseRamping = false;\n                    LocalPlayback.super.pause();\n                    rampFactor = 1.0F;\n                    eofFactor = 1.0F;\n                    applyEffectiveVolume();\n                }\n            }\n        };\n        rampHandler.postDelayed(activeRampTask, 16);\n    }\n\n    @Override\n    public void stop() {\n        cancelActiveRamp();\n        rampHandler.removeCallbacks(eofMonitorTask);\n        pauseRamping = false;\n        freshTrack = true;\n        rampFactor = 1.0F;\n        eofFactor = 1.0F;\n        super.stop();\n        applyEffectiveVolume();\n        prepared = false;\n    }',
  ],
  [
    playerLocalPlayback,
    '    @Override\n    public float getPlayerVolume() {\n        return player.getVolume();\n    }\n\n    @Override\n    public void setPlayerVolume(float volume) {\n        player.setVolume(volume);\n    }',
    '    @Override\n    public float getVolume() {\n        return userVolume;\n    }\n\n    @Override\n    public void setVolume(float volume) {\n        userVolume = Math.max(0.0F, Math.min(1.0F, volume));\n        applyEffectiveVolume();\n    }\n\n    @Override\n    public void setVolumeMultiplier(float multiplier) {\n        this.volumeMultiplier = multiplier;\n        applyEffectiveVolume();\n    }\n\n    @Override\n    public float getPlayerVolume() {\n        return userVolume * volumeMultiplier;\n    }\n\n    @Override\n    public void setPlayerVolume(float volume) {\n        if (volumeMultiplier > 0.0F) {\n            userVolume = Math.max(0.0F, Math.min(1.0F, volume / volumeMultiplier));\n        }\n        applyEffectiveVolume();\n    }',
  ],
  [
    playerLocalPlayback,
    '    @Override\n    public void destroy() {\n        super.destroy();',
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
]

;(async() => {
  let hasError = false
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
        (filePath === playerMusicModule && fromStr.includes('private Bundle options;') && file.includes('private boolean favoriteState = false;'))
      ) {
        console.log('  already patched, skip')
        continue
      }
      if (file.includes(fromStr)) {
        await fs.promises.writeFile(filePath, file.replace(fromStr, toStr))
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
      throw new Error('target snippet not found')
    } catch (err) {
      hasError = true
      console.error(`Patch ${filePath.replace(rootPath, '')} failed: ${err.message}`)
    }
  }
  console.log('\nDependencies patch finished.\n')
  if (hasError) process.exit(1)
})()
