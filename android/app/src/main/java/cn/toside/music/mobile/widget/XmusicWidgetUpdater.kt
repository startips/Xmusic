package cn.toside.music.mobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.os.Build
import android.widget.RemoteViews
import cn.toside.music.mobile.MainActivity
import cn.toside.music.mobile.R
import java.io.File
import kotlin.math.min
import kotlin.math.roundToInt

object XmusicWidgetUpdater {
  const val PREFS_NAME = "xmusic_widget_state"
  const val ACTION_PLAY_PAUSE = "com.startips.xmusic.WIDGET_ACTION_PLAY_PAUSE"
  const val ACTION_PREV = "com.startips.xmusic.WIDGET_ACTION_PREV"
  const val ACTION_NEXT = "com.startips.xmusic.WIDGET_ACTION_NEXT"
  const val ACTION_FAVORITE = "com.startips.xmusic.WIDGET_ACTION_FAVORITE"

  private const val DEFAULT_ACCENT = 0xFF4DAF7C.toInt()
  private val coverLock = Any()
  private var cachedCoverMtime: Long = -1L
  private var cachedCoverSize: Long = -1L
  private var cachedVinylAccent: Int = 0
  private var cachedRoundedCover: Bitmap? = null
  private var cachedVinylCover: Bitmap? = null

  fun hasActiveWidgets(context: Context): Boolean {
    return try {
      val appCtx = context.applicationContext
      val mgr = AppWidgetManager.getInstance(appCtx) ?: return false
      val capsuleIds = mgr.getAppWidgetIds(ComponentName(appCtx, XmusicCapsuleWidgetProvider::class.java))
      if (capsuleIds != null && capsuleIds.isNotEmpty()) return true
      val cardIds = mgr.getAppWidgetIds(ComponentName(appCtx, XmusicCardWidgetProvider::class.java))
      cardIds != null && cardIds.isNotEmpty()
    } catch (_: Exception) {
      false
    }
  }

  fun invalidateCoverCache() {
    synchronized(coverLock) {
      cachedCoverMtime = -1L
      cachedCoverSize = -1L
      cachedVinylAccent = 0
      cachedRoundedCover = null
      cachedVinylCover = null
    }
  }

  fun savePartialState(
    context: Context,
    title: String?,
    artist: String?,
    lyric: String?,
    isPlaying: Boolean?,
    isFavorite: Boolean?,
    accentColor: Int?,
  ) {
    saveStateAndRefresh(context, title, artist, lyric, isPlaying, isFavorite, accentColor, false)
  }

  fun saveStateAndRefresh(
    context: Context,
    title: String?,
    artist: String?,
    lyric: String?,
    isPlaying: Boolean?,
    isFavorite: Boolean?,
    accentColor: Int?,
    partialOnly: Boolean,
  ) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().apply {
      if (title != null) putString("title", title)
      if (artist != null) putString("artist", artist)
      if (lyric != null) putString("lyric", lyric)
      if (isPlaying != null) putBoolean("isPlaying", isPlaying)
      if (isFavorite != null) putBoolean("isFavorite", isFavorite)
      if (accentColor != null && accentColor != 0) putInt("accentColor", accentColor)
      apply()
    }
    if (partialOnly) {
      updateWidgetsLight(context)
    } else {
      updateAllWidgets(context)
    }
  }

  fun updateWidgetsLight(context: Context) {
    val appCtx = context.applicationContext
    val mgr = AppWidgetManager.getInstance(appCtx) ?: return

    val capsuleIds = mgr.getAppWidgetIds(ComponentName(appCtx, XmusicCapsuleWidgetProvider::class.java))
    val cardIds = mgr.getAppWidgetIds(ComponentName(appCtx, XmusicCardWidgetProvider::class.java))
    val hasCapsule = capsuleIds != null && capsuleIds.isNotEmpty()
    val hasCard = cardIds != null && cardIds.isNotEmpty()
    if (!hasCapsule && !hasCard) return

    val prefs = appCtx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val title = prefs.getString("title", "").orEmpty()
    val artist = prefs.getString("artist", "").orEmpty()
    val lyric = prefs.getString("lyric", "").orEmpty()
    val isPlaying = prefs.getBoolean("isPlaying", false)
    val isFavorite = prefs.getBoolean("isFavorite", false)
    val accent = prefs.getInt("accentColor", DEFAULT_ACCENT)

    val displayTitle = title.ifBlank { "Xmusic" }

    if (hasCapsule) {
      val displaySubtitle = when {
        isPlaying && lyric.isNotBlank() -> "♪ ${lyric.trim()}"
        artist.isNotBlank() -> artist
        else -> "轻触开启沉浸音乐之旅"
      }
      val rv = RemoteViews(appCtx.packageName, R.layout.widget_xmusic_capsule).apply {
        setTextViewText(R.id.widget_title, displayTitle)
        setTextViewText(R.id.widget_subtitle, displaySubtitle)
        setImageViewResource(
          R.id.widget_btn_play_icon,
          if (isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play,
        )
      }
      mgr.partiallyUpdateAppWidget(capsuleIds, rv)
    }

    if (hasCard) {
      val displayArtist = artist.ifBlank { "随时聆听好音乐" }
      val displayLyric = if (lyric.isBlank()) "♪ 轻触播放，实时同步桌面歌词" else "♪ ${lyric.trim()}"
      val rv = RemoteViews(appCtx.packageName, R.layout.widget_xmusic_card).apply {
        setTextViewText(R.id.widget_title, displayTitle)
        setTextViewText(R.id.widget_artist, displayArtist)
        setTextViewText(R.id.widget_lyric, displayLyric)
        setTextColor(R.id.widget_lyric, brightenForDarkCard(accent))
        setImageViewResource(
          R.id.widget_btn_play_icon,
          if (isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play,
        )
        setImageViewResource(
          R.id.widget_btn_fav,
          if (isFavorite) R.drawable.ic_media_favorite_on else R.drawable.ic_media_favorite_off,
        )
      }
      mgr.partiallyUpdateAppWidget(cardIds, rv)
    }
  }

  fun updateAllWidgets(context: Context) {
    val appCtx = context.applicationContext
    val mgr = AppWidgetManager.getInstance(appCtx) ?: return

    val capsuleIds = mgr.getAppWidgetIds(ComponentName(appCtx, XmusicCapsuleWidgetProvider::class.java))
    if (capsuleIds != null && capsuleIds.isNotEmpty()) {
      updateCapsuleWidgets(appCtx, mgr, capsuleIds)
    }

    val cardIds = mgr.getAppWidgetIds(ComponentName(appCtx, XmusicCardWidgetProvider::class.java))
    if (cardIds != null && cardIds.isNotEmpty()) {
      updateCardWidgets(appCtx, mgr, cardIds)
    }
  }

  fun updateCapsuleWidgets(context: Context, mgr: AppWidgetManager, appWidgetIds: IntArray) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val title = prefs.getString("title", "").orEmpty()
    val artist = prefs.getString("artist", "").orEmpty()
    val lyric = prefs.getString("lyric", "").orEmpty()
    val isPlaying = prefs.getBoolean("isPlaying", false)
    val accent = prefs.getInt("accentColor", DEFAULT_ACCENT)

    val displayTitle = title.ifBlank { "Xmusic" }
    val displaySubtitle = when {
      isPlaying && lyric.isNotBlank() -> "♪ ${lyric.trim()}"
      artist.isNotBlank() -> artist
      else -> "轻触开启沉浸音乐之旅"
    }

    val roundedCover = getCachedRoundedCover(context)

    for (id in appWidgetIds) {
      val rv = RemoteViews(context.packageName, R.layout.widget_xmusic_capsule).apply {
        setTextViewText(R.id.widget_title, displayTitle)
        setTextViewText(R.id.widget_subtitle, displaySubtitle)
        setInt(R.id.widget_btn_play_bg, "setColorFilter", accent)
        setImageViewResource(
          R.id.widget_btn_play_icon,
          if (isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play,
        )
        if (roundedCover != null && !roundedCover.isRecycled) {
          setImageViewBitmap(R.id.widget_cover, roundedCover)
        } else {
          setImageViewResource(R.id.widget_cover, R.drawable.ic_widget_disc)
        }

        setOnClickPendingIntent(R.id.widget_root, createOpenAppIntent(context))
        setOnClickPendingIntent(R.id.widget_btn_prev, createActionIntent(context, ACTION_PREV, 2101))
        setOnClickPendingIntent(R.id.widget_btn_play_wrap, createActionIntent(context, ACTION_PLAY_PAUSE, 2102))
        setOnClickPendingIntent(R.id.widget_btn_next, createActionIntent(context, ACTION_NEXT, 2103))
      }
      mgr.updateAppWidget(id, rv)
    }
  }

  fun updateCardWidgets(context: Context, mgr: AppWidgetManager, appWidgetIds: IntArray) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val title = prefs.getString("title", "").orEmpty()
    val artist = prefs.getString("artist", "").orEmpty()
    val lyric = prefs.getString("lyric", "").orEmpty()
    val isPlaying = prefs.getBoolean("isPlaying", false)
    val isFavorite = prefs.getBoolean("isFavorite", false)
    val accent = prefs.getInt("accentColor", DEFAULT_ACCENT)

    val displayTitle = title.ifBlank { "Xmusic" }
    val displayArtist = artist.ifBlank { "随时聆听好音乐" }
    val displayLyric = if (lyric.isBlank()) "♪ 轻触播放，实时同步桌面歌词" else "♪ ${lyric.trim()}"

    val vinylCover = getCachedVinylCover(context, accent)
    val brightLyricColor = brightenForDarkCard(accent)

    for (id in appWidgetIds) {
      val rv = RemoteViews(context.packageName, R.layout.widget_xmusic_card).apply {
        setTextViewText(R.id.widget_title, displayTitle)
        setTextViewText(R.id.widget_artist, displayArtist)
        setTextViewText(R.id.widget_lyric, displayLyric)
        setTextColor(R.id.widget_lyric, brightLyricColor)
        setInt(R.id.widget_btn_play_bg, "setColorFilter", accent)
        setImageViewResource(
          R.id.widget_btn_play_icon,
          if (isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play,
        )
        setImageViewResource(
          R.id.widget_btn_fav,
          if (isFavorite) R.drawable.ic_media_favorite_on else R.drawable.ic_media_favorite_off,
        )
        if (vinylCover != null && !vinylCover.isRecycled) {
          setImageViewBitmap(R.id.widget_cover, vinylCover)
        } else {
          setImageViewResource(R.id.widget_cover, R.drawable.ic_widget_disc)
        }

        setOnClickPendingIntent(R.id.widget_root, createOpenAppIntent(context))
        setOnClickPendingIntent(R.id.widget_btn_prev, createActionIntent(context, ACTION_PREV, 2201))
        setOnClickPendingIntent(R.id.widget_btn_play_wrap, createActionIntent(context, ACTION_PLAY_PAUSE, 2202))
        setOnClickPendingIntent(R.id.widget_btn_next, createActionIntent(context, ACTION_NEXT, 2203))
        setOnClickPendingIntent(R.id.widget_btn_fav, createActionIntent(context, ACTION_FAVORITE, 2204))
      }
      mgr.updateAppWidget(id, rv)
    }
  }

  private fun brightenForDarkCard(color: Int): Int {
    val r = min(255, (Color.red(color) * 0.72f + 255 * 0.28f).toInt())
    val g = min(255, (Color.green(color) * 0.72f + 255 * 0.28f).toInt())
    val b = min(255, (Color.blue(color) * 0.72f + 255 * 0.28f).toInt())
    return Color.argb(242, r, g, b)
  }

  private fun getCachedRoundedCover(context: Context): Bitmap? {
    synchronized(coverLock) {
      val f = File(context.cacheDir, "widget_cover.png")
      if (!f.exists() || f.length() == 0L) {
        cachedCoverMtime = -1L
        cachedCoverSize = -1L
        cachedRoundedCover = null
        cachedVinylCover = null
        return null
      }
      val mtime = f.lastModified()
      val len = f.length()
      val existing = cachedRoundedCover
      if (mtime == cachedCoverMtime && len == cachedCoverSize && existing != null && !existing.isRecycled) {
        return existing
      }
      val raw = loadCachedCover(f) ?: return null
      if (mtime != cachedCoverMtime || len != cachedCoverSize) {
        cachedVinylCover = null
      }
      cachedCoverMtime = mtime
      cachedCoverSize = len
      cachedRoundedCover = buildRoundedSquareCover(raw, 128, 34f)
      if (!raw.isRecycled) raw.recycle()
      return cachedRoundedCover
    }
  }

  private fun getCachedVinylCover(context: Context, accent: Int): Bitmap? {
    synchronized(coverLock) {
      val f = File(context.cacheDir, "widget_cover.png")
      if (!f.exists() || f.length() == 0L) {
        cachedCoverMtime = -1L
        cachedCoverSize = -1L
        cachedRoundedCover = null
        cachedVinylCover = null
        return null
      }
      val mtime = f.lastModified()
      val len = f.length()
      val existing = cachedVinylCover
      if (
        mtime == cachedCoverMtime &&
        len == cachedCoverSize &&
        cachedVinylAccent == accent &&
        existing != null &&
        !existing.isRecycled
      ) {
        return existing
      }
      val raw = loadCachedCover(f) ?: return null
      if (mtime != cachedCoverMtime || len != cachedCoverSize) {
        cachedRoundedCover = null
      }
      cachedCoverMtime = mtime
      cachedCoverSize = len
      cachedVinylAccent = accent
      cachedVinylCover = buildVinylCover(raw, 156, accent)
      if (!raw.isRecycled) raw.recycle()
      return cachedVinylCover
    }
  }

  private fun loadCachedCover(f: File): Bitmap? = try {
    if (!f.exists() || f.length() == 0L) null else BitmapFactory.decodeFile(f.absolutePath)
  } catch (_: Exception) {
    null
  }

  private fun buildRoundedSquareCover(src: Bitmap, sizePx: Int, radiusPx: Float): Bitmap {
    val scaled = Bitmap.createScaledBitmap(src, sizePx, sizePx, true)
    val out = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG).apply {
      shader = BitmapShader(scaled, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
    }
    canvas.drawRoundRect(RectF(0f, 0f, sizePx.toFloat(), sizePx.toFloat()), radiusPx, radiusPx, paint)
    if (scaled != src && !scaled.isRecycled) scaled.recycle()
    return out
  }

  private fun buildVinylCover(src: Bitmap, sizePx: Int, accentColor: Int): Bitmap {
    val out = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(out)
    val center = sizePx * 0.5f

    val rimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF101014.toInt() }
    canvas.drawCircle(center, center, center, rimPaint)

    val groovePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = 1.5f
      color = 0x28FFFFFF
    }
    canvas.drawCircle(center, center, center * 0.91f, groovePaint)

    val artSize = (sizePx * 0.78f).roundToInt()
    val artOffset = (sizePx - artSize) * 0.5f
    val scaled = Bitmap.createScaledBitmap(src, artSize, artSize, true)
    val artCircle = Bitmap.createBitmap(artSize, artSize, Bitmap.Config.ARGB_8888)
    val artCanvas = Canvas(artCircle)
    val artPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG).apply {
      shader = BitmapShader(scaled, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
    }
    artCanvas.drawCircle(artSize * 0.5f, artSize * 0.5f, artSize * 0.5f, artPaint)
    canvas.drawBitmap(artCircle, artOffset, artOffset, null)

    val spindleRing = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = accentColor }
    canvas.drawCircle(center, center, sizePx * 0.085f, spindleRing)
    val spindleHole = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF18171C.toInt() }
    canvas.drawCircle(center, center, sizePx * 0.042f, spindleHole)

    if (scaled != src && !scaled.isRecycled) scaled.recycle()
    artCircle.recycle()
    return out
  }

  private fun createOpenAppIntent(context: Context): PendingIntent {
    val intent = Intent(context, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    return PendingIntent.getActivity(context, 2000, intent, flags)
  }

  private fun createActionIntent(context: Context, action: String, reqCode: Int): PendingIntent {
    val intent = Intent(context, XmusicWidgetActionReceiver::class.java).apply {
      this.action = action
      setPackage(context.packageName)
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    return PendingIntent.getBroadcast(context, reqCode, intent, flags)
  }
}
