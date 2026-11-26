package cn.toside.music.mobile.core

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * Launch a coroutine on [scope] and resolve/reject the RN [Promise] safely.
 */
inline fun <T> Promise.launchCatching(
  scope: CoroutineScope,
  dispatcher: CoroutineDispatcher = Dispatchers.IO,
  errorCode: String = "ERR_NATIVE",
  crossinline block: suspend () -> T,
): Job = scope.launch(dispatcher) {
  try {
    val result = block()
    resolve(result)
  } catch (ce: CancellationException) {
    reject("ERR_CANCELLED", ce.message ?: "Operation cancelled", ce)
    throw ce
  } catch (t: Throwable) {
    reject(errorCode, t.message ?: t.javaClass.simpleName, t)
  }
}

/**
 * Emit a device event to JS only when a React instance is active.
 */
fun ReactContext.sendJsEvent(eventName: String, data: Any? = null) {
  if (!hasActiveReactInstance()) return
  getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    .emit(eventName, data)
}

fun ReadableMap?.getStringOrNull(key: String): String? {
  if (this == null || !hasKey(key) || isNull(key)) return null
  return if (getType(key) == ReadableType.String) getString(key) else null
}

fun ReadableMap?.getBooleanOrDefault(key: String, defaultValue: Boolean): Boolean {
  if (this == null || !hasKey(key) || isNull(key)) return defaultValue
  return if (getType(key) == ReadableType.Boolean) getBoolean(key) else defaultValue
}

fun ReadableMap?.getDoubleOrDefault(key: String, defaultValue: Double): Double {
  if (this == null || !hasKey(key) || isNull(key)) return defaultValue
  return if (getType(key) == ReadableType.Number) getDouble(key) else defaultValue
}
