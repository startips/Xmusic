package cn.toside.music.mobile.userApi

import android.os.Build
import android.util.Base64
import android.util.Log
import cn.toside.music.mobile.core.sendJsEvent
import cn.toside.music.mobile.crypto.AES
import cn.toside.music.mobile.crypto.RSA
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.whl.quickjs.android.QuickJSLoader
import com.whl.quickjs.wrapper.JSCallFunction
import com.whl.quickjs.wrapper.QuickJSContext
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.json.JSONTokener
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

data class UserApiScriptInfo(
  val id: String,
  val name: String,
  val description: String,
  val version: String,
  val author: String,
  val homepage: String,
  val script: String,
)

/**
 * Single-thread coroutine-confined QuickJS runtime for UserApi custom scripts.
 * All QuickJSContext creation, evaluation, invocation, timeout callbacks, and destruction
 * strictly execute on the single dedicated QuickJS thread, while script HTTP requests execute
 * directly on native OkHttp without crossing the React Native JS bridge.
 */
class QuickJsEngine(
  private val reactContext: ReactApplicationContext,
) {
  companion object {
    private const val TAG = "UserApi"
    private const val EVENT_API_ACTION = "api-action"

    @Volatile
    private var loaderInitialized = false
  }

  private val executor = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "XmusicQuickJS")
  }
  private val jsDispatcher = executor.asCoroutineDispatcher()
  private val exceptionHandler = CoroutineExceptionHandler { _, ex ->
    Log.e(TAG, "Uncaught exception in QuickJsEngine", ex)
    emitLog("error", "Uncaught exception in QuickJsEngine: ${ex.message}")
  }
  private val scope = CoroutineScope(SupervisorJob() + jsDispatcher + exceptionHandler)
  private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO + exceptionHandler)
  private val httpClient = QuickJsHttpClient()

  private val destroyed = AtomicBoolean(false)
  private var jsContext: QuickJSContext? = null
  private var key: String = ""
  private var inited: Boolean = false

  fun loadScript(info: UserApiScriptInfo) {
    if (destroyed.get()) return
    scope.launch {
      if (destroyed.get()) return@launch
      val err = evaluateScriptOnJsThread(info)
      if (err.isNotEmpty()) {
        Log.w(TAG, "script load failed: $err")
        emitInitFailed(err)
      }
    }
  }

  fun sendAction(action: String, data: String) {
    if (destroyed.get()) return
    scope.launch {
      if (destroyed.get() || jsContext == null) return@launch
      callJsOnJsThread(action, data)
    }
  }

  fun destroy() {
    if (!destroyed.compareAndSet(false, true)) return
    httpClient.cancelAll()
    ioScope.cancel()
    scope.cancel()
    try {
      executor.execute {
        try {
          jsContext?.destroy()
        } catch (e: Exception) {
          Log.w(TAG, "destroy QuickJSContext error", e)
        } finally {
          jsContext = null
        }
      }
    } catch (_: Exception) {
    } finally {
      executor.shutdown()
    }
  }

  private fun evaluateScriptOnJsThread(info: UserApiScriptInfo): String {
    if (!loaderInitialized) {
      QuickJSLoader.init()
      loaderInitialized = true
    }
    httpClient.cancelAll()
    key = UUID.randomUUID().toString()
    inited = false

    jsContext?.let {
      try {
        it.destroy()
      } catch (_: Exception) {}
    }

    val ctx = QuickJSContext.create()
    jsContext = ctx
    ctx.setConsole(QuickJsConsole { type, msg -> emitLog(type, msg) })

    val preloadScript = readPreloadScript() ?: return "create JavaScript Env failed"
    bindNativeBridge(ctx)
    ctx.evaluate(preloadScript)
    ctx.globalObject.getJSFunction("lx_setup").call(
      key,
      info.id,
      info.name,
      info.description,
      info.version,
      info.author,
      info.homepage,
      info.script,
    )

    return try {
      ctx.evaluate(info.script)
      ""
    } catch (e: Exception) {
      Log.e(TAG, "load script error: ${e.message}")
      try {
        callJsOnJsThread("__run_error__")
      } catch (_: Exception) {}
      if (inited) "" else {
        inited = true
        e.message ?: "Script evaluation error"
      }
    }
  }

  private fun readPreloadScript(): String? {
    return try {
      reactContext.assets.open("script/user-api-preload.js").use { input ->
        input.readBytes().toString(StandardCharsets.UTF_8)
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun handleNativeHttpRequest(rawData: String) {
    val payload = try {
      JSONObject(rawData)
    } catch (e: Exception) {
      Log.w(TAG, "Malformed HTTP request payload: ${e.message}")
      return
    }
    val requestKey = payload.optString("requestKey", "")
    val url = payload.optString("url", "")
    val options = payload.optJSONObject("options")
    if (requestKey.isEmpty() || url.isEmpty()) return

    val activeKey = key
    httpClient.execute(requestKey, url, options, ioScope) { reqKey, error, respJson ->
      if (destroyed.get()) return@execute
      val responsePayload = JSONObject().apply {
        put("requestKey", reqKey)
        if (error != null) put("error", error) else put("error", JSONObject.NULL)
        if (respJson != null) put("response", respJson) else put("response", JSONObject.NULL)
      }.toString()
      scope.launch {
        if (!destroyed.get() && jsContext != null && key == activeKey) {
          callJsOnJsThread("response", responsePayload)
        }
      }
    }
  }

  private fun handleNativeCancelRequest(rawData: String) {
    val reqKey = try {
      when (val parsed = JSONTokener(rawData).nextValue()) {
        is String -> parsed
        else -> rawData
      }
    } catch (_: Exception) {
      rawData
    }
    if (reqKey.isNotEmpty()) {
      httpClient.cancel(reqKey)
    }
  }

  private fun bindNativeBridge(ctx: QuickJSContext) {
    val global = ctx.globalObject

    global.setProperty("__lx_native_call__", JSCallFunction { args ->
      if (args != null && args.size >= 3 && key == args[0]) {
        val action = args[1] as? String ?: return@JSCallFunction null
        val data = args[2] as? String
        when (action) {
          "request" -> {
            if (data != null) handleNativeHttpRequest(data)
            return@JSCallFunction null
          }
          "cancelRequest" -> {
            if (data != null) handleNativeCancelRequest(data)
            return@JSCallFunction null
          }
          "init" -> {
            if (inited) return@JSCallFunction null
            inited = true
          }
        }
        emitAction(action, data)
      }
      null
    })

    global.setProperty("__lx_native_call__utils_str2b64", JSCallFunction { args ->
      try {
        val input = args?.getOrNull(0) as? String ?: ""
        String(Base64.encode(input.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP), StandardCharsets.UTF_8)
      } catch (e: Exception) {
        Log.e("UserApi [utils]", "utils_str2b64 error: ${e.message}")
        ""
      }
    })

    global.setProperty("__lx_native_call__utils_b642buf", JSCallFunction { args ->
      try {
        val input = args?.getOrNull(0) as? String ?: ""
        val byteArray = Base64.decode(input.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP)
        val sb = StringBuilder(byteArray.size * 4 + 2)
        sb.append('[')
        for (i in byteArray.indices) {
          if (i > 0) sb.append(',')
          sb.append(byteArray[i].toInt() and 0xFF)
        }
        sb.append(']')
        sb.toString()
      } catch (e: Exception) {
        Log.e("UserApi [utils]", "utils_b642buf error: ${e.message}")
        ""
      }
    })

    global.setProperty("__lx_native_call__utils_str2md5", JSCallFunction { args ->
      try {
        val raw = args?.getOrNull(0) as? String ?: ""
        val str = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          URLDecoder.decode(raw, StandardCharsets.UTF_8)
        } else {
          @Suppress("DEPRECATION")
          URLDecoder.decode(raw, "UTF-8")
        }
        val md5Bytes = MessageDigest.getInstance("MD5").digest(str.toByteArray(StandardCharsets.UTF_8))
        val sb = StringBuilder(md5Bytes.size * 2)
        for (b in md5Bytes) {
          sb.append(String.format("%02x", b))
        }
        sb.toString()
      } catch (e: Exception) {
        Log.e("UserApi [utils]", "utils_str2md5 error: ${e.message}")
        ""
      }
    })

    global.setProperty("__lx_native_call__utils_aes_encrypt", JSCallFunction { args ->
      try {
        AES.encrypt(
          args?.getOrNull(0) as? String ?: "",
          args?.getOrNull(1) as? String ?: "",
          args?.getOrNull(2) as? String ?: "",
          args?.getOrNull(3) as? String ?: "",
        )
      } catch (e: Exception) {
        Log.e("UserApi [utils]", "utils_aes_encrypt error: ${e.message}")
        ""
      }
    })

    global.setProperty("__lx_native_call__utils_rsa_encrypt", JSCallFunction { args ->
      try {
        RSA.encryptRSAToString(
          args?.getOrNull(0) as? String ?: "",
          args?.getOrNull(1) as? String ?: "",
          args?.getOrNull(2) as? String ?: "",
        )
      } catch (e: Exception) {
        Log.e("UserApi [utils]", "utils_rsa_encrypt error: ${e.message}")
        ""
      }
    })

    global.setProperty("__lx_native_call__set_timeout", JSCallFunction { args ->
      val delayMs = ((args?.getOrNull(1) as? Number)?.toLong() ?: 0L).coerceAtLeast(0L)
      val idArg = args?.getOrNull(0)
      scope.launch {
        if (delayMs > 0L) delay(delayMs)
        if (!destroyed.get() && jsContext != null) {
          callJsOnJsThread("__set_timeout__", idArg)
        }
      }
      null
    })
  }

  private fun callJsOnJsThread(action: String, vararg args: Any?): Any? {
    val ctx = jsContext ?: return null
    val params = Array<Any?>(args.size + 2) { null }
    params[0] = key
    params[1] = action
    for (i in args.indices) {
      params[i + 2] = args[i]
    }
    return try {
      ctx.globalObject.getJSFunction("__lx_native__").call(*params)
    } catch (e: Exception) {
      var msg = e.message ?: return null
      if (msg.length > 1024) msg = msg.substring(0, 1024) + "..."
      emitLog("error", "Call script error: $msg")
      Log.e(TAG, "Call script error: ${e.message}")
      if (!inited) {
        emitInitFailed(msg)
        inited = true
      }
      null
    }
  }

  private fun emitAction(action: String, data: String?) {
    val map = Arguments.createMap().apply {
      putString("action", action)
      if (data != null) putString("data", data) else putNull("data")
    }
    reactContext.sendJsEvent(EVENT_API_ACTION, map)
  }

  private fun emitLog(type: String, log: String) {
    val map = Arguments.createMap().apply {
      putString("action", "log")
      putString("type", type)
      putString("log", log)
    }
    reactContext.sendJsEvent(EVENT_API_ACTION, map)
  }

  private fun emitInitFailed(errorMessage: String) {
    val map = Arguments.createMap().apply {
      putString("action", "init")
      putString("errorMessage", errorMessage)
      putString(
        "data",
        "{ \"info\": null, \"status\": false, \"errorMessage\": \"Create JavaScript Env Failed\" }",
      )
    }
    reactContext.sendJsEvent(EVENT_API_ACTION, map)
    emitLog("error", errorMessage)
  }
}
