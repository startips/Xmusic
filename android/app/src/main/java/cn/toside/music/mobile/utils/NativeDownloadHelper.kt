package cn.toside.music.mobile.utils

import cn.toside.music.mobile.core.ModuleCoroutineScope
import cn.toside.music.mobile.core.getBooleanOrDefault
import cn.toside.music.mobile.core.getDoubleOrDefault
import cn.toside.music.mobile.core.getStringOrNull
import cn.toside.music.mobile.core.sendJsEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Native OkHttp file downloader backed by coroutine IO, replacing legacy react-native-fs.
 */
class NativeDownloadHelper(
  private val reactAppContext: ReactApplicationContext,
  private val coroutineScope: ModuleCoroutineScope,
) {
  companion object {
    private const val EVENT_BEGIN = "download-begin"
    private const val EVENT_PROGRESS = "download-progress"
    private const val DEFAULT_CONNECT_TIMEOUT_MS = 15_000L
    private const val DEFAULT_READ_TIMEOUT_MS = 30_000L
    private const val DEFAULT_PROGRESS_INTERVAL_MS = 500L
  }

  private data class ActiveDownload(
    val job: Job,
    @Volatile var call: Call? = null,
  )

  private val baseClient: OkHttpClient by lazy {
    OkHttpClient.Builder()
      .followRedirects(true)
      .followSslRedirects(true)
      .build()
  }

  private val activeDownloads = ConcurrentHashMap<Int, ActiveDownload>()

  fun downloadFile(options: ReadableMap?, promise: Promise) {
    if (options == null) {
      promise.reject("ERR_DOWNLOAD_ARGS", "Download options are null")
      return
    }
    val jobId = options.getDoubleOrDefault("jobId", 0.0).toInt()
    val fromUrl = options.getStringOrNull("fromUrl")?.trim().orEmpty()
    val toFile = options.getStringOrNull("toFile")?.trim().orEmpty()
    if (jobId <= 0 || fromUrl.isEmpty() || toFile.isEmpty()) {
      promise.reject("ERR_DOWNLOAD_ARGS", "Invalid download parameters (jobId/fromUrl/toFile)")
      return
    }

    val connectTimeoutMs = options.getDoubleOrDefault("connectionTimeout", DEFAULT_CONNECT_TIMEOUT_MS.toDouble())
      .toLong().coerceAtLeast(1_000L)
    val readTimeoutMs = options.getDoubleOrDefault("readTimeout", DEFAULT_READ_TIMEOUT_MS.toDouble())
      .toLong().coerceAtLeast(1_000L)
    val progressIntervalMs = options.getDoubleOrDefault("progressInterval", DEFAULT_PROGRESS_INTERVAL_MS.toDouble())
      .toLong().coerceAtLeast(0L)
    val progressDivider = options.getDoubleOrDefault("progressDivider", 0.0)
    val hasBeginCallback = options.getBooleanOrDefault("hasBeginCallback", false)
    val hasProgressCallback = options.getBooleanOrDefault("hasProgressCallback", false)

    val headersBuilder = okhttp3.Headers.Builder()
    if (options.hasKey("headers") && !options.isNull("headers") && options.getType("headers") == ReadableType.Map) {
      val headersMap = options.getMap("headers")
      if (headersMap != null) {
        val it = headersMap.keySetIterator()
        while (it.hasNextKey()) {
          val k = it.nextKey()
          val v = headersMap.getStringOrNull(k)
          if (v != null) {
            headersBuilder.add(k, v)
          }
        }
      }
    }

    // Cancel any pre-existing job with the same id before registering the new entry
    activeDownloads.remove(jobId)?.let { prev ->
      prev.call?.cancel()
      prev.job.cancel()
    }

    val entryRef = arrayOfNulls<ActiveDownload>(1)
    val job = coroutineScope.scope.launch(Dispatchers.IO, start = CoroutineStart.LAZY) {
      val currentEntry = entryRef[0]
      val targetFile = File(toFile)
      val partFile = File("${targetFile.absolutePath}.part")
      try {
        targetFile.parentFile?.mkdirs()
        if (partFile.exists()) partFile.delete()

        val client = baseClient.newBuilder()
          .connectTimeout(connectTimeoutMs, TimeUnit.MILLISECONDS)
          .readTimeout(readTimeoutMs, TimeUnit.MILLISECONDS)
          .build()
        val request = Request.Builder()
          .url(fromUrl)
          .headers(headersBuilder.build())
          .get()
          .build()

        val call = client.newCall(request)
        currentEntry?.call = call
        ensureActive()

        call.execute().use { response ->
          val statusCode = response.code
          val body = response.body
          val contentLength = body?.contentLength() ?: -1L

          if (!response.isSuccessful) {
            throw IOException("HTTP error status code: $statusCode")
          }
          if (body == null) {
            throw IOException("Empty response body")
          }

          if (hasBeginCallback) {
            val beginPayload = Arguments.createMap().apply {
              putInt("jobId", jobId)
              putInt("statusCode", statusCode)
              putDouble("contentLength", contentLength.toDouble())
              val respHeaders = Arguments.createMap()
              for (name in response.headers.names()) {
                response.headers[name]?.let { value -> respHeaders.putString(name, value) }
              }
              putMap("headers", respHeaders)
            }
            reactAppContext.sendJsEvent(EVENT_BEGIN, beginPayload)
          }

          var bytesWritten = 0L
          var lastNotifyMs = 0L
          var lastDividerStep = -1L
          val buffer = ByteArray(16 * 1024)

          body.byteStream().use { input ->
            FileOutputStream(partFile).use { output ->
              while (true) {
                ensureActive()
                val read = input.read(buffer)
                if (read < 0) break
                if (read == 0) continue
                output.write(buffer, 0, read)
                bytesWritten += read

                if (hasProgressCallback) {
                  val now = System.currentTimeMillis()
                  var shouldEmit = progressIntervalMs <= 0L || now - lastNotifyMs >= progressIntervalMs
                  if (shouldEmit && progressDivider > 0.0 && contentLength > 0L) {
                    val step = ((bytesWritten * 100.0 / contentLength) / progressDivider).toLong()
                    if (step == lastDividerStep && bytesWritten < contentLength) {
                      shouldEmit = false
                    } else {
                      lastDividerStep = step
                    }
                  }
                  if (shouldEmit) {
                    lastNotifyMs = now
                    emitProgress(jobId, contentLength, bytesWritten)
                  }
                }
              }
              output.flush()
            }
          }

          ensureActive()
          if (hasProgressCallback && bytesWritten > 0L) {
            emitProgress(jobId, contentLength, bytesWritten)
          }

          if (targetFile.exists()) {
            targetFile.delete()
          }
          if (!partFile.renameTo(targetFile)) {
            partFile.copyTo(targetFile, overwrite = true)
            partFile.delete()
          }

          val result = Arguments.createMap().apply {
            putInt("jobId", jobId)
            putInt("statusCode", statusCode)
            putDouble("bytesWritten", bytesWritten.toDouble())
          }
          promise.resolve(result)
        }
      } catch (ce: CancellationException) {
        if (partFile.exists()) partFile.delete()
        promise.reject("ERR_CANCELLED", "Download cancelled", ce)
        throw ce
      } catch (t: Throwable) {
        if (partFile.exists()) partFile.delete()
        promise.reject("ERR_DOWNLOAD", t.message ?: t.javaClass.simpleName, t)
      } finally {
        if (currentEntry != null) {
          activeDownloads.remove(jobId, currentEntry)
        }
      }
    }

    val entry = ActiveDownload(job = job)
    entryRef[0] = entry
    activeDownloads[jobId] = entry
    job.start()
  }

  private fun emitProgress(jobId: Int, contentLength: Long, bytesWritten: Long) {
    val payload = Arguments.createMap().apply {
      putInt("jobId", jobId)
      putDouble("contentLength", contentLength.toDouble())
      putDouble("bytesWritten", bytesWritten.toDouble())
    }
    reactAppContext.sendJsEvent(EVENT_PROGRESS, payload)
  }

  fun stopDownload(jobId: Int) {
    val active = activeDownloads.remove(jobId) ?: return
    active.call?.cancel()
    active.job.cancel()
  }

  fun cancelAll() {
    val keys = activeDownloads.keys.toList()
    for (jobId in keys) {
      stopDownload(jobId)
    }
  }
}
