package cn.toside.music.mobile.player

import android.content.Context
import android.net.Uri
import androidx.media3.common.util.UnstableApi
import cn.toside.music.mobile.player.cache.PlayerMediaCache
import org.json.JSONObject
import java.io.File

data class RecoverablePlaybackTrack(
  val trackId: String,
  val url: String,
  val cacheKey: String?,
  val userAgent: String?,
  val headers: Map<String, String>?,
  val title: String,
  val artist: String,
  val album: String?,
  val artwork: String?,
  val durationMs: Long,
  val positionMs: Long,
  val isLocal: Boolean,
  val isFavorite: Boolean,
)

/**
 * Lightweight SharedPreferences persistence for the last active playable track,
 * allowing [XmusicPlaybackService] to resume local or cached playback cleanly from
 * desktop widgets or Bluetooth media keys even when the RN UI process was cold-killed.
 */
@UnstableApi
object PlaybackRecoveryStore {
  private const val PREFS_NAME = "xmusic_playback_recovery"

  internal fun serializeHeaders(headers: Map<String, String>?): String {
    if (headers.isNullOrEmpty()) return ""
    val obj = JSONObject()
    for ((k, v) in headers) {
      obj.put(k, v)
    }
    return obj.toString()
  }

  internal fun deserializeHeaders(json: String?): Map<String, String>? {
    if (json.isNullOrBlank()) return null
    return try {
      val obj = JSONObject(json)
      val out = LinkedHashMap<String, String>()
      val iter = obj.keys()
      while (iter.hasNext()) {
        val k = iter.next()
        out[k] = obj.optString(k, "")
      }
      out.ifEmpty { null }
    } catch (_: Exception) {
      null
    }
  }

  fun saveTrackSource(
    context: Context,
    trackId: String,
    url: String,
    cacheKey: String?,
    userAgent: String?,
    headers: Map<String, String>?,
    durationMs: Long,
    isLocal: Boolean,
  ) {
    if (url.isBlank()) return
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
      putString("trackId", trackId)
      putString("url", url)
      putString("cacheKey", cacheKey ?: "")
      putString("userAgent", userAgent ?: "")
      putString("headers", serializeHeaders(headers))
      if (durationMs > 0L) putLong("durationMs", durationMs)
      putLong("positionMs", 0L)
      putBoolean("isLocal", isLocal)
      apply()
    }
  }

  fun saveMetadata(
    context: Context,
    title: String,
    artist: String,
    album: String?,
    artwork: String?,
    durationMs: Long,
  ) {
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
      putString("title", title)
      putString("artist", artist)
      putString("album", album ?: "")
      putString("artwork", artwork ?: "")
      if (durationMs > 0L) putLong("durationMs", durationMs)
      apply()
    }
  }

  fun savePosition(context: Context, positionMs: Long) {
    if (positionMs < 0L) return
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
      putLong("positionMs", positionMs)
      apply()
    }
  }

  fun saveFavorite(context: Context, isFavorite: Boolean) {
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
      putBoolean("isFavorite", isFavorite)
      apply()
    }
  }

  fun load(context: Context): RecoverablePlaybackTrack? {
    val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val url = prefs.getString("url", "").orEmpty()
    if (url.isBlank()) return null
    return RecoverablePlaybackTrack(
      trackId = prefs.getString("trackId", "").orEmpty(),
      url = url,
      cacheKey = prefs.getString("cacheKey", "")?.takeIf { it.isNotBlank() },
      userAgent = prefs.getString("userAgent", "")?.takeIf { it.isNotBlank() },
      headers = deserializeHeaders(prefs.getString("headers", null)),
      title = prefs.getString("title", "Xmusic").orEmpty().ifBlank { "Xmusic" },
      artist = prefs.getString("artist", "").orEmpty(),
      album = prefs.getString("album", "")?.takeIf { it.isNotBlank() },
      artwork = prefs.getString("artwork", "")?.takeIf { it.isNotBlank() },
      durationMs = prefs.getLong("durationMs", 0L),
      positionMs = prefs.getLong("positionMs", 0L),
      isLocal = prefs.getBoolean("isLocal", false),
      isFavorite = prefs.getBoolean("isFavorite", false),
    )
  }

  fun canResumeNatively(context: Context, track: RecoverablePlaybackTrack): Boolean {
    if (track.url.isBlank()) return false
    if (track.isLocal) {
      val resolved = PlayerMediaCache.resolvePlayableLocalUri(context, Uri.parse(track.url))
      return when (resolved.scheme) {
        null, "file" -> {
          val path = resolved.path ?: track.url
          File(path).let { it.exists() && it.canRead() && it.length() > 0L }
        }
        "content" -> {
          try {
            context.applicationContext.contentResolver.openAssetFileDescriptor(resolved, "r")?.use { true } ?: false
          } catch (_: Exception) {
            false
          }
        }
        else -> false
      }
    }
    val key = track.cacheKey ?: track.url
    return PlayerMediaCache.isLeadingCached(key, 32L * 1024L)
  }
}
