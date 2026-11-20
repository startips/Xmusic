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

const patchs = [
  // 1. 同时写入 MEDIA_METADATA_KEY_ART，部分系统（含 HyperOS 超级岛）只读取该字段
  [
    playerMetadata,
    'import static android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ARTIST;',
    'import static android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ART;\nimport static android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ARTIST;',
  ],
  // 2. 提高封面解码分辨率，避免通知栏 / 超级岛封面模糊
  [
    playerMetadata,
    '                .override(512, 512)',
    '                .override(1024, 1024)',
  ],
  // 3. updateArtwork 同步 ART 位图
  [
    playerMetadata,
    '        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, bitmap);\n        builder.setLargeIcon(bitmap);',
    '        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, bitmap);\n        metadata.putBitmap(METADATA_KEY_ART, bitmap);\n        builder.setLargeIcon(bitmap);',
  ],
  // 4. 复用封面缓存时同步 ART 位图
  [
    playerMetadata,
    '            metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, prevArtResource);\n            builder.setLargeIcon(prevArtResource);',
    '            metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, prevArtResource);\n            metadata.putBitmap(METADATA_KEY_ART, prevArtResource);\n            builder.setLargeIcon(prevArtResource);',
  ],
  // 5. Glide 加载完成后同步 ART 位图
  [
    playerMetadata,
    '                        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, resource);\n                        builder.setLargeIcon(resource);',
    '                        metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, resource);\n                        metadata.putBitmap(METADATA_KEY_ART, resource);\n                        builder.setLargeIcon(resource);',
  ],
  // 6. 更新标题 / 歌词时保持封面位图，避免 SystemUI 丢失封面
  [
    playerMetadata,
    '      session.setMetadata(prevMetadata.build());\n      updatePlaybackState(manager.getPlayback());',
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
    '    private int getFavoriteIconRes(boolean favorite) {\n        if (favorite) {\n            if (favoriteOnIconRes == 0) {\n                favoriteOnIconRes = service.getResources().getIdentifier("ic_media_favorite_on", "drawable", service.getPackageName());\n            }\n            return favoriteOnIconRes;\n        }\n        if (favoriteOffIconRes == 0) {\n            favoriteOffIconRes = service.getResources().getIdentifier("ic_media_favorite_off", "drawable", service.getPackageName());\n        }\n        return favoriteOffIconRes;\n    }\n\n    @SuppressLint("UnspecifiedImmutableFlag")\n    private Action createFavoriteAction() {\n        int favIcon = getFavoriteIconRes(isFavorite);\n        if (favIcon == 0) return null;\n        Intent favIntent = new Intent(service, MusicService.class);\n        favIntent.setAction(ACTION_TOGGLE_FAVORITE);\n        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M\n            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE\n            : PendingIntent.FLAG_UPDATE_CURRENT;\n        PendingIntent pi = PendingIntent.getService(service, 1001, favIntent, flags);\n        return new Action(favIcon, isFavorite ? "已收藏" : "收藏", pi);\n    }\n\n    public void setFavorite(boolean favorite) {\n        this.isFavorite = favorite;\n        ExoPlayback playback = manager.getPlayback();\n        if (playback != null) {\n            updatePlayback(lastPlaying);\n            updatePlaybackState(playback);\n            updateNotification();\n        }\n    }\n\n    private void updatePlaybackState(ExoPlayback playback) {\n        // Updates the media session state\n        PlaybackStateCompat.Builder pb = new PlaybackStateCompat.Builder();\n        pb.setActions(actions);\n        pb.setState(playback.getState(), playback.getPosition(), playback.getRate());\n        pb.setBufferedPosition(playback.getBufferedPosition());\n\n        int favIcon = getFavoriteIconRes(isFavorite);\n        if (favIcon != 0) {\n            Bundle extras = new Bundle();\n            extras.putBoolean("isFavorite", isFavorite);\n            pb.addCustomAction(new PlaybackStateCompat.CustomAction.Builder(\n                ACTION_TOGGLE_FAVORITE,\n                isFavorite ? "已收藏" : "收藏",\n                favIcon\n            ).setExtras(extras).build());\n        }\n\n        session.setPlaybackState(pb.build());\n    }',
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
  // 12. MusicService 引入包并在 onStartCommand 拦截收藏 PendingIntent（避免重置 MusicManager）
  [
    playerMusicService,
    'import com.facebook.react.ReactInstanceManager;',
    'import com.facebook.react.ReactInstanceManager;\nimport com.guichaguri.trackplayer.module.MusicEvents;\nimport com.guichaguri.trackplayer.service.metadata.MetadataManager;',
  ],
  [
    playerMusicService,
    '    @Override\n    public int onStartCommand(Intent intent, int flags, int startId) {\n        if(intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {',
    '    @Override\n    public int onStartCommand(Intent intent, int flags, int startId) {\n        if(intent != null && MetadataManager.ACTION_TOGGLE_FAVORITE.equals(intent.getAction())) {\n            emit(MusicEvents.BUTTON_TOGGLE_FAVORITE, null);\n            return START_NOT_STICKY;\n        }\n\n        if(intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {',
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
  // 16. MusicModule 暴露 setFavoriteState ReactMethod（仅在服务已连接时刷新，避免冷启动拉起空白通知）
  [
    playerMusicModule,
    '    @ReactMethod\n    public void getState(final Promise callback) {\n        if (binder == null) {\n            callback.resolve(PlaybackStateCompat.STATE_NONE);\n        } else {\n            waitForConnection(() -> callback.resolve(binder.getPlayback().getState()));\n        }\n    }\n}',
    '    @ReactMethod\n    public void setFavoriteState(final boolean favorite, final Promise callback) {\n        this.favoriteState = favorite;\n        if (binder != null) {\n            binder.post(() -> {\n                if (binder != null) binder.setFavoriteState(favorite);\n                callback.resolve(null);\n            });\n        } else {\n            callback.resolve(null);\n        }\n    }\n\n    @ReactMethod\n    public void getState(final Promise callback) {\n        if (binder == null) {\n            callback.resolve(PlaybackStateCompat.STATE_NONE);\n        } else {\n            waitForConnection(() -> callback.resolve(binder.getPlayback().getState()));\n        }\n    }\n}',
  ],
]

;(async() => {
  for (const [filePath, fromStr, toStr] of patchs) {
    console.log(`Patching ${filePath.replace(rootPath, '')}`)
    try {
      const file = (await fs.promises.readFile(filePath)).toString()
      if (file.includes(toStr)) {
        console.log('  already patched, skip')
        continue
      }
      if (!file.includes(fromStr)) {
        throw new Error('target snippet not found')
      }
      await fs.promises.writeFile(filePath, file.replace(fromStr, toStr))
    } catch (err) {
      console.error(`Patch ${filePath.replace(rootPath, '')} failed: ${err.message}`)
    }
  }
  console.log('\nDependencies patch finished.\n')
})()
