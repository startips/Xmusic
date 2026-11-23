package cn.toside.music.mobile.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Build;
import android.widget.RemoteViews;

import java.io.File;

import cn.toside.music.mobile.MainActivity;
import cn.toside.music.mobile.R;

public final class XmusicWidgetUpdater {
  public static final String PREFS_NAME = "xmusic_widget_state";
  public static final String ACTION_PLAY_PAUSE = "com.startips.xmusic.WIDGET_ACTION_PLAY_PAUSE";
  public static final String ACTION_PREV = "com.startips.xmusic.WIDGET_ACTION_PREV";
  public static final String ACTION_NEXT = "com.startips.xmusic.WIDGET_ACTION_NEXT";
  public static final String ACTION_FAVORITE = "com.startips.xmusic.WIDGET_ACTION_FAVORITE";

  private static final int DEFAULT_ACCENT = 0xFF4DAF7C;
  private static final Object COVER_LOCK = new Object();
  private static long sCachedCoverMtime = -1L;
  private static long sCachedCoverSize = -1L;
  private static int sCachedVinylAccent = 0;
  private static Bitmap sCachedRoundedCover = null;
  private static Bitmap sCachedVinylCover = null;

  private XmusicWidgetUpdater() {}

  public static void invalidateCoverCache() {
    synchronized (COVER_LOCK) {
      sCachedCoverMtime = -1L;
      sCachedCoverSize = -1L;
      sCachedVinylAccent = 0;
      sCachedRoundedCover = null;
      sCachedVinylCover = null;
    }
  }

  public static void savePartialState(
    Context context,
    String title,
    String artist,
    String lyric,
    Boolean isPlaying,
    Boolean isFavorite,
    Integer accentColor
  ) {
    saveStateAndRefresh(context, title, artist, lyric, isPlaying, isFavorite, accentColor, false);
  }

  public static void saveStateAndRefresh(
    Context context,
    String title,
    String artist,
    String lyric,
    Boolean isPlaying,
    Boolean isFavorite,
    Integer accentColor,
    boolean partialOnly
  ) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    SharedPreferences.Editor editor = prefs.edit();
    if (title != null) editor.putString("title", title);
    if (artist != null) editor.putString("artist", artist);
    if (lyric != null) editor.putString("lyric", lyric);
    if (isPlaying != null) editor.putBoolean("isPlaying", isPlaying);
    if (isFavorite != null) editor.putBoolean("isFavorite", isFavorite);
    if (accentColor != null && accentColor != 0) editor.putInt("accentColor", accentColor);
    editor.apply();
    if (partialOnly) {
      updateWidgetsLight(context);
    } else {
      updateAllWidgets(context);
    }
  }

  public static void updateWidgetsLight(Context context) {
    Context appCtx = context.getApplicationContext();
    AppWidgetManager mgr = AppWidgetManager.getInstance(appCtx);
    if (mgr == null) return;

    int[] capsuleIds = mgr.getAppWidgetIds(new ComponentName(appCtx, XmusicCapsuleWidgetProvider.class));
    int[] cardIds = mgr.getAppWidgetIds(new ComponentName(appCtx, XmusicCardWidgetProvider.class));
    boolean hasCapsule = capsuleIds != null && capsuleIds.length > 0;
    boolean hasCard = cardIds != null && cardIds.length > 0;
    if (!hasCapsule && !hasCard) return;

    SharedPreferences prefs = appCtx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    String title = prefs.getString("title", "");
    String artist = prefs.getString("artist", "");
    String lyric = prefs.getString("lyric", "");
    boolean isPlaying = prefs.getBoolean("isPlaying", false);
    boolean isFavorite = prefs.getBoolean("isFavorite", false);
    int accent = prefs.getInt("accentColor", DEFAULT_ACCENT);

    String displayTitle = (title == null || title.trim().isEmpty()) ? "Xmusic" : title;

    if (hasCapsule) {
      String displaySubtitle;
      if (isPlaying && lyric != null && !lyric.trim().isEmpty()) {
        displaySubtitle = "♪ " + lyric.trim();
      } else if (artist != null && !artist.trim().isEmpty()) {
        displaySubtitle = artist;
      } else {
        displaySubtitle = "轻触开启沉浸音乐之旅";
      }
      RemoteViews rv = new RemoteViews(appCtx.getPackageName(), R.layout.widget_xmusic_capsule);
      rv.setTextViewText(R.id.widget_title, displayTitle);
      rv.setTextViewText(R.id.widget_subtitle, displaySubtitle);
      rv.setImageViewResource(
        R.id.widget_btn_play_icon,
        isPlaying ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play
      );
      mgr.partiallyUpdateAppWidget(capsuleIds, rv);
    }

    if (hasCard) {
      String displayArtist = (artist == null || artist.trim().isEmpty()) ? "随时聆听好音乐" : artist;
      String displayLyric = (lyric == null || lyric.trim().isEmpty())
        ? "♪ 轻触播放，实时同步桌面歌词"
        : "♪ " + lyric.trim();
      RemoteViews rv = new RemoteViews(appCtx.getPackageName(), R.layout.widget_xmusic_card);
      rv.setTextViewText(R.id.widget_title, displayTitle);
      rv.setTextViewText(R.id.widget_artist, displayArtist);
      rv.setTextViewText(R.id.widget_lyric, displayLyric);
      rv.setTextColor(R.id.widget_lyric, brightenForDarkCard(accent));
      rv.setImageViewResource(
        R.id.widget_btn_play_icon,
        isPlaying ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play
      );
      rv.setImageViewResource(
        R.id.widget_btn_fav,
        isFavorite ? R.drawable.ic_media_favorite_on : R.drawable.ic_media_favorite_off
      );
      mgr.partiallyUpdateAppWidget(cardIds, rv);
    }
  }

  public static void updateAllWidgets(Context context) {
    Context appCtx = context.getApplicationContext();
    AppWidgetManager mgr = AppWidgetManager.getInstance(appCtx);
    if (mgr == null) return;

    int[] capsuleIds = mgr.getAppWidgetIds(new ComponentName(appCtx, XmusicCapsuleWidgetProvider.class));
    if (capsuleIds != null && capsuleIds.length > 0) {
      updateCapsuleWidgets(appCtx, mgr, capsuleIds);
    }

    int[] cardIds = mgr.getAppWidgetIds(new ComponentName(appCtx, XmusicCardWidgetProvider.class));
    if (cardIds != null && cardIds.length > 0) {
      updateCardWidgets(appCtx, mgr, cardIds);
    }
  }

  public static void updateCapsuleWidgets(Context context, AppWidgetManager mgr, int[] appWidgetIds) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    String title = prefs.getString("title", "");
    String artist = prefs.getString("artist", "");
    String lyric = prefs.getString("lyric", "");
    boolean isPlaying = prefs.getBoolean("isPlaying", false);
    int accent = prefs.getInt("accentColor", DEFAULT_ACCENT);

    String displayTitle = (title == null || title.trim().isEmpty()) ? "Xmusic" : title;
    String displaySubtitle;
    if (isPlaying && lyric != null && !lyric.trim().isEmpty()) {
      displaySubtitle = "♪ " + lyric.trim();
    } else if (artist != null && !artist.trim().isEmpty()) {
      displaySubtitle = artist;
    } else {
      displaySubtitle = "轻触开启沉浸音乐之旅";
    }

    Bitmap roundedCover = getCachedRoundedCover(context);

    for (int id : appWidgetIds) {
      RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.widget_xmusic_capsule);
      rv.setTextViewText(R.id.widget_title, displayTitle);
      rv.setTextViewText(R.id.widget_subtitle, displaySubtitle);
      rv.setInt(R.id.widget_btn_play_bg, "setColorFilter", accent);
      rv.setImageViewResource(
        R.id.widget_btn_play_icon,
        isPlaying ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play
      );
      if (roundedCover != null && !roundedCover.isRecycled()) {
        rv.setImageViewBitmap(R.id.widget_cover, roundedCover);
      } else {
        rv.setImageViewResource(R.id.widget_cover, R.drawable.ic_widget_disc);
      }

      rv.setOnClickPendingIntent(R.id.widget_root, createOpenAppIntent(context));
      rv.setOnClickPendingIntent(R.id.widget_btn_prev, createActionIntent(context, ACTION_PREV, 2101));
      rv.setOnClickPendingIntent(R.id.widget_btn_play_wrap, createActionIntent(context, ACTION_PLAY_PAUSE, 2102));
      rv.setOnClickPendingIntent(R.id.widget_btn_next, createActionIntent(context, ACTION_NEXT, 2103));

      mgr.updateAppWidget(id, rv);
    }
  }

  public static void updateCardWidgets(Context context, AppWidgetManager mgr, int[] appWidgetIds) {
    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    String title = prefs.getString("title", "");
    String artist = prefs.getString("artist", "");
    String lyric = prefs.getString("lyric", "");
    boolean isPlaying = prefs.getBoolean("isPlaying", false);
    boolean isFavorite = prefs.getBoolean("isFavorite", false);
    int accent = prefs.getInt("accentColor", DEFAULT_ACCENT);

    String displayTitle = (title == null || title.trim().isEmpty()) ? "Xmusic" : title;
    String displayArtist = (artist == null || artist.trim().isEmpty()) ? "随时聆听好音乐" : artist;
    String displayLyric = (lyric == null || lyric.trim().isEmpty())
      ? "♪ 轻触播放，实时同步桌面歌词"
      : "♪ " + lyric.trim();

    Bitmap vinylCover = getCachedVinylCover(context, accent);

    int brightLyricColor = brightenForDarkCard(accent);

    for (int id : appWidgetIds) {
      RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.widget_xmusic_card);
      rv.setTextViewText(R.id.widget_title, displayTitle);
      rv.setTextViewText(R.id.widget_artist, displayArtist);
      rv.setTextViewText(R.id.widget_lyric, displayLyric);
      rv.setTextColor(R.id.widget_lyric, brightLyricColor);
      rv.setInt(R.id.widget_btn_play_bg, "setColorFilter", accent);
      rv.setImageViewResource(
        R.id.widget_btn_play_icon,
        isPlaying ? R.drawable.ic_widget_pause : R.drawable.ic_widget_play
      );
      rv.setImageViewResource(
        R.id.widget_btn_fav,
        isFavorite ? R.drawable.ic_media_favorite_on : R.drawable.ic_media_favorite_off
      );
      if (vinylCover != null && !vinylCover.isRecycled()) {
        rv.setImageViewBitmap(R.id.widget_cover, vinylCover);
      } else {
        rv.setImageViewResource(R.id.widget_cover, R.drawable.ic_widget_disc);
      }

      rv.setOnClickPendingIntent(R.id.widget_root, createOpenAppIntent(context));
      rv.setOnClickPendingIntent(R.id.widget_btn_prev, createActionIntent(context, ACTION_PREV, 2201));
      rv.setOnClickPendingIntent(R.id.widget_btn_play_wrap, createActionIntent(context, ACTION_PLAY_PAUSE, 2202));
      rv.setOnClickPendingIntent(R.id.widget_btn_next, createActionIntent(context, ACTION_NEXT, 2203));
      rv.setOnClickPendingIntent(R.id.widget_btn_fav, createActionIntent(context, ACTION_FAVORITE, 2204));

      mgr.updateAppWidget(id, rv);
    }
  }

  private static int brightenForDarkCard(int color) {
    int r = Math.min(255, (int) (Color.red(color) * 0.72f + 255 * 0.28f));
    int g = Math.min(255, (int) (Color.green(color) * 0.72f + 255 * 0.28f));
    int b = Math.min(255, (int) (Color.blue(color) * 0.72f + 255 * 0.28f));
    return Color.argb(242, r, g, b);
  }

  private static Bitmap getCachedRoundedCover(Context context) {
    synchronized (COVER_LOCK) {
      File f = new File(context.getCacheDir(), "widget_cover.png");
      if (!f.exists() || f.length() == 0) {
        sCachedCoverMtime = -1L;
        sCachedCoverSize = -1L;
        sCachedRoundedCover = null;
        sCachedVinylCover = null;
        return null;
      }
      long mtime = f.lastModified();
      long len = f.length();
      if (mtime == sCachedCoverMtime && len == sCachedCoverSize && sCachedRoundedCover != null && !sCachedRoundedCover.isRecycled()) {
        return sCachedRoundedCover;
      }
      Bitmap raw = loadCachedCover(f);
      if (raw == null) return null;
      if (mtime != sCachedCoverMtime || len != sCachedCoverSize) {
        sCachedVinylCover = null;
      }
      sCachedCoverMtime = mtime;
      sCachedCoverSize = len;
      sCachedRoundedCover = buildRoundedSquareCover(raw, 128, 34f);
      if (!raw.isRecycled()) raw.recycle();
      return sCachedRoundedCover;
    }
  }

  private static Bitmap getCachedVinylCover(Context context, int accent) {
    synchronized (COVER_LOCK) {
      File f = new File(context.getCacheDir(), "widget_cover.png");
      if (!f.exists() || f.length() == 0) {
        sCachedCoverMtime = -1L;
        sCachedCoverSize = -1L;
        sCachedRoundedCover = null;
        sCachedVinylCover = null;
        return null;
      }
      long mtime = f.lastModified();
      long len = f.length();
      if (
        mtime == sCachedCoverMtime &&
        len == sCachedCoverSize &&
        sCachedVinylAccent == accent &&
        sCachedVinylCover != null &&
        !sCachedVinylCover.isRecycled()
      ) {
        return sCachedVinylCover;
      }
      Bitmap raw = loadCachedCover(f);
      if (raw == null) return null;
      if (mtime != sCachedCoverMtime || len != sCachedCoverSize) {
        sCachedRoundedCover = null;
      }
      sCachedCoverMtime = mtime;
      sCachedCoverSize = len;
      sCachedVinylAccent = accent;
      sCachedVinylCover = buildVinylCover(raw, 156, accent);
      if (!raw.isRecycled()) raw.recycle();
      return sCachedVinylCover;
    }
  }

  private static Bitmap loadCachedCover(File f) {
    try {
      if (!f.exists() || f.length() == 0) return null;
      return BitmapFactory.decodeFile(f.getAbsolutePath());
    } catch (Exception ignored) {
      return null;
    }
  }

  private static Bitmap buildRoundedSquareCover(Bitmap src, int sizePx, float radiusPx) {
    Bitmap scaled = Bitmap.createScaledBitmap(src, sizePx, sizePx, true);
    Bitmap out = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
    Canvas canvas = new Canvas(out);
    Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
    paint.setShader(new BitmapShader(scaled, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
    canvas.drawRoundRect(new RectF(0, 0, sizePx, sizePx), radiusPx, radiusPx, paint);
    if (scaled != src && !scaled.isRecycled()) scaled.recycle();
    return out;
  }

  private static Bitmap buildVinylCover(Bitmap src, int sizePx, int accentColor) {
    Bitmap out = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
    Canvas canvas = new Canvas(out);
    float center = sizePx * 0.5f;

    // Outer vinyl rim
    Paint rimPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    rimPaint.setColor(0xFF101014);
    canvas.drawCircle(center, center, center, rimPaint);

    // Subtle groove ring
    Paint groovePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    groovePaint.setStyle(Paint.Style.STROKE);
    groovePaint.setStrokeWidth(1.5f);
    groovePaint.setColor(0x28FFFFFF);
    canvas.drawCircle(center, center, center * 0.91f, groovePaint);

    // Inner circular album art
    int artSize = Math.round(sizePx * 0.78f);
    float artOffset = (sizePx - artSize) * 0.5f;
    Bitmap scaled = Bitmap.createScaledBitmap(src, artSize, artSize, true);
    Bitmap artCircle = Bitmap.createBitmap(artSize, artSize, Bitmap.Config.ARGB_8888);
    Canvas artCanvas = new Canvas(artCircle);
    Paint artPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
    artPaint.setShader(new BitmapShader(scaled, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
    artCanvas.drawCircle(artSize * 0.5f, artSize * 0.5f, artSize * 0.5f, artPaint);
    canvas.drawBitmap(artCircle, artOffset, artOffset, null);

    // Vinyl center spindle dot
    Paint spindleRing = new Paint(Paint.ANTI_ALIAS_FLAG);
    spindleRing.setColor(accentColor);
    canvas.drawCircle(center, center, sizePx * 0.085f, spindleRing);
    Paint spindleHole = new Paint(Paint.ANTI_ALIAS_FLAG);
    spindleHole.setColor(0xFF18171C);
    canvas.drawCircle(center, center, sizePx * 0.042f, spindleHole);

    if (scaled != src && !scaled.isRecycled()) scaled.recycle();
    artCircle.recycle();
    return out;
  }

  private static PendingIntent createOpenAppIntent(Context context) {
    Intent intent = new Intent(context, MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
      ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      : PendingIntent.FLAG_UPDATE_CURRENT;
    return PendingIntent.getActivity(context, 2000, intent, flags);
  }

  private static PendingIntent createActionIntent(Context context, String action, int reqCode) {
    Intent intent = new Intent(context, XmusicWidgetActionReceiver.class);
    intent.setAction(action);
    intent.setPackage(context.getPackageName());
    int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
      ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      : PendingIntent.FLAG_UPDATE_CURRENT;
    return PendingIntent.getBroadcast(context, reqCode, intent, flags);
  }
}
