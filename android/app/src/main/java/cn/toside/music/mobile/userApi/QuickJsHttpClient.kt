package cn.toside.music.mobile.userApi

import android.util.Base64
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.Call
import okhttp3.Headers
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Native OkHttp HTTP executor for QuickJS UserApi scripts, eliminating double-JS-engine
 * RN Bridge hops and enabling immediate native Call cancellation.
 */
class QuickJsHttpClient {

  companion object {
    private const val DEFAULT_TIMEOUT_MS = 18_000L
    private const val MAX_TIMEOUT_MS = 60_000L
    private const val MAX_RESPONSE_BYTES = 16 * 1024 * 1024
    internal const val DEFAULT_USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"

    internal fun mergeHeadersCaseInsensitive(userHeaders: Map<String, String>): LinkedHashMap<String, String> {
      val result = LinkedHashMap<String, String>()
      val lowerToKey = HashMap<String, String>()

      fun putCI(key: String, value: String) {
        val lower = key.lowercase(Locale.US)
        val existingKey = lowerToKey[lower]
        if (existingKey != null && existingKey != key) {
          result.remove(existingKey)
        }
        lowerToKey[lower] = key
        result[key] = value
      }

      putCI("Accept", "application/json")
      putCI("User-Agent", DEFAULT_USER_AGENT)
      for ((k, v) in userHeaders) {
        putCI(k, v)
      }
      return result
    }

    internal fun findHeaderCI(headers: Map<String, String>, target: String): String? {
      val lower = target.lowercase(Locale.US)
      for ((k, v) in headers) {
        if (k.lowercase(Locale.US) == lower) return v
      }
      return null
    }

    internal fun encodeFormUrlEncoded(formObj: JSONObject): String {
      val sb = StringBuilder()
      val iter = formObj.keys()
      var first = true
      while (iter.hasNext()) {
        val k = iter.next()
        val rawVal = formObj.opt(k)
        val v = if (rawVal == null || rawVal === JSONObject.NULL) "" else rawVal.toString()
        if (!first) sb.append('&')
        first = false
        sb.append(URLEncoder.encode(k, "UTF-8").replace("+", "%20"))
        sb.append('=')
        sb.append(URLEncoder.encode(v, "UTF-8").replace("+", "%20"))
      }
      return sb.toString()
    }

    internal fun parseJsonOrRawString(raw: String): Any {
      val trimmed = raw.trim()
      if (trimmed.isEmpty()) return raw
      val first = trimmed[0]
      if (first != '{' && first != '[') return raw
      return try {
        val parsed = JSONTokener(trimmed).nextValue()
        if (parsed is JSONObject || parsed is JSONArray) parsed else raw
      } catch (_: Exception) {
        raw
      }
    }
  }

  private val baseClient: OkHttpClient by lazy {
    OkHttpClient.Builder()
      .followRedirects(true)
      .followSslRedirects(true)
      .build()
  }

  private val activeCalls = ConcurrentHashMap<String, Call>()

  fun execute(
    requestKey: String,
    url: String,
    options: JSONObject?,
    scope: CoroutineScope,
    onComplete: (requestKey: String, error: String?, response: JSONObject?) -> Unit,
  ) {
    val callHolder = arrayOfNulls<Call>(1)
    val job = scope.launch(Dispatchers.IO, start = CoroutineStart.LAZY) {
      var registeredCall: Call? = null
      try {
        val methodRaw = options?.optString("method", "GET")?.trim().orEmpty()
        val method = if (methodRaw.isEmpty()) "GET" else methodRaw.uppercase(Locale.US)
        val timeoutMs = (options?.optLong("timeout", DEFAULT_TIMEOUT_MS) ?: DEFAULT_TIMEOUT_MS)
          .coerceIn(1_000L, MAX_TIMEOUT_MS)
        val isBinary = options?.optBoolean("binary", false) == true

        val userHeaders = LinkedHashMap<String, String>()
        val headersObj = options?.optJSONObject("headers")
        if (headersObj != null) {
          val keys = headersObj.keys()
          while (keys.hasNext()) {
            val k = keys.next()
            val v = headersObj.opt(k)
            if (v != null && v !== JSONObject.NULL) {
              userHeaders[k] = v.toString()
            }
          }
        }
        val mergedHeaders = mergeHeadersCaseInsensitive(userHeaders)
        val requestBody = buildRequestBody(method, options, mergedHeaders)

        val headersBuilder = Headers.Builder()
        for ((k, v) in mergedHeaders) {
          headersBuilder.addUnsafeNonAscii(k, v)
        }

        val req = Request.Builder()
          .url(url)
          .headers(headersBuilder.build())
          .method(method, requestBody)
          .build()

        val client = baseClient.newBuilder()
          .connectTimeout(timeoutMs, TimeUnit.MILLISECONDS)
          .readTimeout(timeoutMs, TimeUnit.MILLISECONDS)
          .writeTimeout(timeoutMs, TimeUnit.MILLISECONDS)
          .callTimeout(timeoutMs, TimeUnit.MILLISECONDS)
          .build()

        val call = client.newCall(req)
        registeredCall = call
        callHolder[0] = call
        activeCalls[requestKey] = call

        call.execute().use { resp ->
          val bodyBytes = resp.body?.byteStream()?.use { stream ->
            readCappedBytes(stream, MAX_RESPONSE_BYTES)
          } ?: ByteArray(0)

          val respHeaders = JSONObject()
          for (name in resp.headers.names()) {
            val values = resp.headers.values(name)
            val lower = name.lowercase(Locale.US)
            respHeaders.put(lower, values.joinToString(", "))
          }

          val respJson = JSONObject().apply {
            put("headers", respHeaders)
            put("statusCode", resp.code)
            put("statusMessage", resp.message)
            put("url", resp.request.url.toString())
            put("ok", resp.isSuccessful)
            if (isBinary) {
              put("isBinary", true)
              put("body", Base64.encodeToString(bodyBytes, Base64.NO_WRAP))
            } else {
              val text = String(bodyBytes, StandardCharsets.UTF_8)
              put("body", parseJsonOrRawString(text))
            }
          }
          onComplete(requestKey, null, respJson)
        }
      } catch (e: Exception) {
        val msg = e.message?.takeIf { it.isNotBlank() } ?: e.javaClass.simpleName
        onComplete(requestKey, msg, null)
      } finally {
        registeredCall?.let { activeCalls.remove(requestKey, it) }
      }
    }
    job.start()
  }

  fun cancel(requestKey: String) {
    activeCalls.remove(requestKey)?.cancel()
  }

  fun cancelAll() {
    val keys = activeCalls.keys.toList()
    for (k in keys) {
      activeCalls.remove(k)?.cancel()
    }
  }

  private fun buildRequestBody(
    method: String,
    options: JSONObject?,
    mergedHeaders: LinkedHashMap<String, String>,
  ): RequestBody? {
    if (method == "GET" || method == "HEAD") return null

    val formObj = options?.optJSONObject("form")
    val formDataObj = options?.optJSONObject("formData")
    val rawBody = options?.opt("body")

    if (formObj != null) {
      val existingCt = findHeaderCI(mergedHeaders, "content-type")
      val ct = existingCt ?: "application/x-www-form-urlencoded; charset=utf-8"
      if (existingCt == null) mergedHeaders["Content-Type"] = "application/x-www-form-urlencoded"
      val encoded = encodeFormUrlEncoded(formObj)
      return encoded.toRequestBody(ct.toMediaTypeOrNull())
    }

    if (formDataObj != null) {
      val builder = MultipartBody.Builder().setType(MultipartBody.FORM)
      val keys = formDataObj.keys()
      while (keys.hasNext()) {
        val k = keys.next()
        val v = formDataObj.opt(k)
        builder.addFormDataPart(k, if (v == null || v === JSONObject.NULL) "" else v.toString())
      }
      return builder.build()
    }

    if (rawBody != null && rawBody !== JSONObject.NULL) {
      val existingCt = findHeaderCI(mergedHeaders, "content-type")
      val textPayload = when (rawBody) {
        is JSONObject, is JSONArray -> {
          if (existingCt == null) mergedHeaders["Content-Type"] = "application/json"
          rawBody.toString()
        }
        else -> {
          if (existingCt == null && method == "POST") {
            mergedHeaders["Content-Type"] = "application/json"
          }
          rawBody.toString()
        }
      }
      val mediaType = (findHeaderCI(mergedHeaders, "content-type") ?: "text/plain; charset=utf-8").toMediaTypeOrNull()
      return textPayload.toRequestBody(mediaType)
    }

    return if (method == "POST" || method == "PUT" || method == "PATCH") {
      "".toRequestBody(null)
    } else {
      null
    }
  }

  private fun readCappedBytes(stream: java.io.InputStream, maxBytes: Int): ByteArray {
    val out = ByteArrayOutputStream(8192)
    val buf = ByteArray(16 * 1024)
    var total = 0
    while (true) {
      val read = stream.read(buf)
      if (read < 0) break
      if (read == 0) continue
      total += read
      if (total > maxBytes) {
        throw IOException("Response body exceeds limit ($maxBytes bytes)")
      }
      out.write(buf, 0, read)
    }
    return out.toByteArray()
  }
}
