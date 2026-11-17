// 修补依赖源码以使构建的依赖恢复正常工作
// 该脚本在 npm install 之后自动执行（见 package.json 的 postinstall）

const fs = require('node:fs')
const path = require('node:path')

const rootPath = path.join(__dirname, './')

const playerMetadata = path.join(
  rootPath,
  'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/metadata/MetadataManager.java',
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
]

;(async() => {
  for (const [filePath, fromStr, toStr] of patchs) {
    console.log(`Patching ${filePath.replace(rootPath, '')}`)
    try {
      const file = (await fs.promises.readFile(filePath)).toString()
      if (!file.includes(fromStr)) {
        if (file.includes(toStr)) {
          console.log('  already patched, skip')
          continue
        }
        throw new Error('target snippet not found')
      }
      await fs.promises.writeFile(filePath, file.replace(fromStr, toStr))
    } catch (err) {
      console.error(`Patch ${filePath.replace(rootPath, '')} failed: ${err.message}`)
    }
  }
  console.log('\nDependencies patch finished.\n')
})()
