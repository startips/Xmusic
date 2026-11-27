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
import kotlinx.coroutines.ExperimentalCoroutinesApi
import java.util.concurrent.atomic.AtomicInteger

class XmusicStorageModule(
  private val reactAppContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactAppContext) {

  private val coroutineScope = ModuleCoroutineScope()

  @OptIn(ExperimentalCoroutinesApi::class)
  private val writeDispatcher = Dispatchers.IO.limitedParallelism(1)
  private val pendingWrites = AtomicInteger(0)

  private val engine: XmusicStorageEngine by lazy {
    XmusicStorageEngine.getInstance(reactAppContext)
  }

  override fun getName(): String = "XmusicStorageModule"

  override fun invalidate() {
    coroutineScope.cancel()
    super.invalidate()
  }

  private fun launchWrite(promise: Promise, errorCode: String, block: () -> Any?) {
    pendingWrites.incrementAndGet()
    promise.launchCatching(coroutineScope.scope, writeDispatcher, errorCode) {
      try {
        block()
      } finally {
        pendingWrites.decrementAndGet()
      }
    }
  }

  private fun launchRead(promise: Promise, errorCode: String, block: () -> Any?) {
    val dispatcher = if (pendingWrites.get() > 0) writeDispatcher else Dispatchers.IO
    promise.launchCatching(coroutineScope.scope, dispatcher, errorCode) {
      block()
    }
  }

  @ReactMethod
  fun getItem(key: String, promise: Promise) {
    launchRead(promise, "ERR_STORAGE_GET") {
      engine.getItem(key)
    }
  }

  @ReactMethod
  fun setItem(key: String, value: String, promise: Promise) {
    launchWrite(promise, "ERR_STORAGE_SET") {
      engine.setItem(key, value)
      null
    }
  }

  @ReactMethod
  fun removeItem(key: String, promise: Promise) {
    launchWrite(promise, "ERR_STORAGE_REMOVE") {
      engine.removeItem(key)
      null
    }
  }

  @ReactMethod
  fun getAllKeys(promise: Promise) {
    launchRead(promise, "ERR_STORAGE_KEYS") {
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
    launchRead(promise, "ERR_STORAGE_MULTIGET") {
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
    launchWrite(promise, "ERR_STORAGE_MULTISET") {
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
    launchWrite(promise, "ERR_STORAGE_MULTIREMOVE") {
      engine.multiRemove(keyList)
      null
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    launchWrite(promise, "ERR_STORAGE_CLEAR") {
      engine.clear()
      null
    }
  }

  @ReactMethod
  fun getPlaylistTracks(listId: String, promise: Promise) {
    launchRead(promise, "ERR_PLAYLIST_GET") {
      engine.getPlaylistTracksJson(listId)
    }
  }

  @ReactMethod
  fun overwritePlaylistTracks(listId: String, tracksJsonArray: String, promise: Promise) {
    launchWrite(promise, "ERR_PLAYLIST_OVERWRITE") {
      engine.overwritePlaylistTracks(listId, tracksJsonArray)
      null
    }
  }

  @ReactMethod
  fun addPlaylistTracks(listId: String, tracksJsonArray: String, atTop: Boolean, promise: Promise) {
    launchWrite(promise, "ERR_PLAYLIST_ADD") {
      engine.addPlaylistTracks(listId, tracksJsonArray, atTop)
      null
    }
  }

  @ReactMethod
  fun removePlaylistTracks(listId: String, trackIds: ReadableArray, promise: Promise) {
    val ids = ArrayList<String>(trackIds.size())
    for (i in 0 until trackIds.size()) {
      val id = trackIds.getString(i)
      if (!id.isNullOrEmpty()) ids.add(id)
    }
    launchWrite(promise, "ERR_PLAYLIST_REMOVE") {
      engine.removePlaylistTracks(listId, ids)
      null
    }
  }

  @ReactMethod
  fun updatePlaylistTracks(updatesJsonArray: String, promise: Promise) {
    launchWrite(promise, "ERR_PLAYLIST_UPDATE") {
      engine.updatePlaylistTracks(updatesJsonArray)
      null
    }
  }

  @ReactMethod
  fun reorderPlaylistTracks(listId: String, orderedTrackIds: ReadableArray, promise: Promise) {
    val ids = ArrayList<String>(orderedTrackIds.size())
    for (i in 0 until orderedTrackIds.size()) {
      val id = orderedTrackIds.getString(i)
      if (!id.isNullOrEmpty()) ids.add(id)
    }
    launchWrite(promise, "ERR_PLAYLIST_REORDER") {
      engine.reorderPlaylistTracks(listId, ids)
      null
    }
  }

  @ReactMethod
  fun clearPlaylistTracks(listIds: ReadableArray, promise: Promise) {
    val ids = ArrayList<String>(listIds.size())
    for (i in 0 until listIds.size()) {
      val id = listIds.getString(i)
      if (!id.isNullOrEmpty()) ids.add(id)
    }
    launchWrite(promise, "ERR_PLAYLIST_CLEAR") {
      engine.clearPlaylistTracks(ids)
      null
    }
  }
}
