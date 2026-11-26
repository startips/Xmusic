package cn.toside.music.mobile.cache

import cn.toside.music.mobile.core.ModuleCoroutineScope
import cn.toside.music.mobile.core.launchCatching
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlinx.coroutines.Dispatchers

class CacheModule(
  private val reactAppContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactAppContext) {

  private val coroutineScope = ModuleCoroutineScope()

  override fun getName(): String = "CacheModule"

  override fun invalidate() {
    coroutineScope.cancel()
    super.invalidate()
  }

  @ReactMethod
  fun getAppCacheSize(promise: Promise) {
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO) {
      var fileSize = CacheUtils.getDirSize(reactAppContext.cacheDir)
      fileSize += CacheUtils.getDirSize(CacheUtils.getExternalCacheDir(reactAppContext))
      fileSize.toString()
    }
  }

  @ReactMethod
  fun clearAppCache(promise: Promise) {
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO) {
      clearCache()
      null
    }
  }

  fun clearCache() {
    reactAppContext.deleteDatabase("webview.db")
    reactAppContext.deleteDatabase("webview.db-shm")
    reactAppContext.deleteDatabase("webview.db-wal")
    reactAppContext.deleteDatabase("webviewCache.db")
    reactAppContext.deleteDatabase("webviewCache.db-shm")
    reactAppContext.deleteDatabase("webviewCache.db-wal")
    val now = System.currentTimeMillis()
    CacheUtils.clearCacheFolder(reactAppContext.cacheDir, now)
    CacheUtils.clearCacheFolder(CacheUtils.getExternalCacheDir(reactAppContext), now)
  }
}
