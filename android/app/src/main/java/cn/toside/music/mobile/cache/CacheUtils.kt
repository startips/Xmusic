package cn.toside.music.mobile.cache

import android.content.Context
import java.io.File

object CacheUtils {
  fun getDirSize(dir: File?): Long {
    if (dir == null || !dir.isDirectory) return 0L
    var dirSize = 0L
    val files = dir.listFiles() ?: return 0L
    for (file in files) {
      if (file.isFile) {
        dirSize += file.length()
      } else if (file.isDirectory) {
        dirSize += file.length()
        dirSize += getDirSize(file)
      }
    }
    return dirSize
  }

  fun getExternalCacheDir(context: Context): File? = context.externalCacheDir

  fun clearCacheFolder(dir: File?, curTime: Long): Int {
    var deletedFiles = 0
    if (dir == null || !dir.isDirectory) return deletedFiles
    val files = dir.listFiles() ?: return deletedFiles
    try {
      for (child in files) {
        if (child.isDirectory) {
          deletedFiles += clearCacheFolder(child, curTime)
        }
        if (child.lastModified() < curTime) {
          if (child.delete()) {
            deletedFiles++
          }
        }
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
    return deletedFiles
  }
}
