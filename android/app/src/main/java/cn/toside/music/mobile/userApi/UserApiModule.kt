package cn.toside.music.mobile.userApi

import cn.toside.music.mobile.core.getStringOrNull
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class UserApiModule(
  private val reactAppContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactAppContext) {

  private var engine: QuickJsEngine? = null
  private var listenerCount: Int = 0

  override fun getName(): String = "UserApiModule"

  override fun invalidate() {
    destroy()
    super.invalidate()
  }

  @ReactMethod
  @Suppress("UNUSED_PARAMETER")
  fun addListener(eventName: String) {
    listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    listenerCount = (listenerCount - count).coerceAtLeast(0)
  }

  @ReactMethod
  fun loadScript(data: ReadableMap?) {
    destroy()
    val info = UserApiScriptInfo(
      id = data.getStringOrNull("id") ?: "",
      name = data.getStringOrNull("name") ?: "Unknown",
      description = data.getStringOrNull("description") ?: "",
      version = data.getStringOrNull("version") ?: "",
      author = data.getStringOrNull("author") ?: "",
      homepage = data.getStringOrNull("homepage") ?: "",
      script = data.getStringOrNull("script") ?: "",
    )
    val nextEngine = QuickJsEngine(reactAppContext)
    engine = nextEngine
    nextEngine.loadScript(info)
  }

  @ReactMethod(isBlockingSynchronousMethod = false)
  fun sendAction(action: String, info: String) {
    engine?.sendAction(action, info)
  }

  @ReactMethod
  fun destroy() {
    engine?.destroy()
    engine = null
  }
}
