package cn.toside.music.mobile.storage

import cn.toside.music.mobile.core.ModuleCoroutineScope
import cn.toside.music.mobile.core.launchCatching
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import kotlinx.coroutines.Dispatchers

class XmusicStorageModule(
  private val reactAppContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactAppContext) {

  private val coroutineScope = ModuleCoroutineScope()
  private val engine: XmusicStorageEngine by lazy {
    XmusicStorageEngine.getInstance(reactAppContext)
  }

  override fun getName(): String = "XmusicStorageModule"

  override fun invalidate() {
    coroutineScope.cancel()
    super.invalidate()
  }

  @ReactMethod
  fun getItem(key: String, promise: Promise) {
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO, "ERR_STORAGE_GET") {
      engine.getItem(key)
    }
  }

  @ReactMethod
  fun setItem(key: String, value: String, promise: Promise) {
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO, "ERR_STORAGE_SET") {
      engine.setItem(key, value)
      null
    }
  }

  @ReactMethod
  fun removeItem(key: String, promise: Promise) {
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO, "ERR_STORAGE_REMOVE") {
      engine.removeItem(key)
      null
    }
  }

  @ReactMethod
  fun getAllKeys(promise: Promise) {
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO, "ERR_STORAGE_KEYS") {
      val arr = Arguments.createArray()
      for (k in engine.getAllKeys()) {
        arr.pushString(k)
      }
      arr
    }
  }

  @ReactMethod
  fun multiGet(keys: ReadableArray, promise: Promise) {
    val keyList = ArrayList<String>(keys.size())
    for (i in 0 until keys.size()) {
      val k = keys.getString(i)
      if (!k.isNullOrEmpty()) keyList.add(k)
    }
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO, "ERR_STORAGE_MULTIGET") {
      val out = Arguments.createArray()
      for ((k, v) in engine.multiGet(keyList)) {
        val pair = Arguments.createArray()
        pair.pushString(k)
        if (v != null) pair.pushString(v) else pair.pushNull()
        out.pushArray(pair)
      }
      out
    }
  }

  @ReactMethod
  fun multiSet(kvPairs: ReadableArray, promise: Promise) {
    val entries = ArrayList<Pair<String, String>>(kvPairs.size())
    for (i in 0 until kvPairs.size()) {
      val pair = kvPairs.getArray(i)
      if (pair.size() < 2) continue
      val k = pair.getString(0)
      val v = pair.getString(1)
      entries.add(k to v)
    }
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO, "ERR_STORAGE_MULTISET") {
      engine.multiSet(entries)
      null
    }
  }

  @ReactMethod
  fun multiRemove(keys: ReadableArray, promise: Promise) {
    val keyList = ArrayList<String>(keys.size())
    for (i in 0 until keys.size()) {
      val k = keys.getString(i)
      if (!k.isNullOrEmpty()) keyList.add(k)
    }
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO, "ERR_STORAGE_MULTIREMOVE") {
      engine.multiRemove(keyList)
      null
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    promise.launchCatching(coroutineScope.scope, Dispatchers.IO, "ERR_STORAGE_CLEAR") {
      engine.clear()
      null
    }
  }
}
