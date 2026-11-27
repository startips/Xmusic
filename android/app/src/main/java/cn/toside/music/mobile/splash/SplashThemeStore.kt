package cn.toside.music.mobile.splash

import android.content.Context
import android.content.res.Configuration
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

data class SplashPalette(
  val isDark: Boolean,
  val isCustomSeed: Boolean,
  val backgroundColor: Int,
  val primaryColor: Int,
  val secondaryColor: Int,
  val onSurfaceColor: Int,
)

/**
 * Persists lightweight theme color & mode snapshots so the native cold-start splash
 * renders with the user's active theme immediately before React Native mounts.
 */
object SplashThemeStore {
  private const val PREFS_NAME = "xmusic_splash_theme"

  private const val DEFAULT_BG_LIGHT = 0xFFF7FBF8.toInt()
  private const val DEFAULT_PRIMARY_LIGHT = 0xFF29CA87.toInt()
  private const val DEFAULT_SECONDARY_LIGHT = 0xFF0B7665.toInt()
  private const val DEFAULT_ON_SURFACE_LIGHT = 0xFF171D1A.toInt()

  private const val DEFAULT_BG_DARK = 0xFF101412.toInt()
  private const val DEFAULT_PRIMARY_DARK = 0xFF4DAF7C.toInt()
  private const val DEFAULT_SECONDARY_DARK = 0xFF2B7A68.toInt()
  private const val DEFAULT_ON_SURFACE_DARK = 0xFFE1E8E4.toInt()

  fun save(context: Context, map: ReadableMap?) {
    if (map == null) return
    val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit().apply {
      if (map.hasKey("themeMode") && !map.isNull("themeMode") && map.getType("themeMode") == ReadableType.String) {
        putString("themeMode", map.getString("themeMode"))
      }
      if (map.hasKey("isCustomSeed") && !map.isNull("isCustomSeed") && map.getType("isCustomSeed") == ReadableType.Boolean) {
        putBoolean("isCustomSeed", map.getBoolean("isCustomSeed"))
      }
      putColorIfPresent(this, map, "primaryLight")
      putColorIfPresent(this, map, "primaryDark")
      putColorIfPresent(this, map, "secondaryLight")
      putColorIfPresent(this, map, "secondaryDark")
      putColorIfPresent(this, map, "backgroundLight")
      putColorIfPresent(this, map, "backgroundDark")
      putColorIfPresent(this, map, "onSurfaceLight")
      putColorIfPresent(this, map, "onSurfaceDark")
      apply()
    }
  }

  private fun putColorIfPresent(
    editor: android.content.SharedPreferences.Editor,
    map: ReadableMap,
    key: String,
  ) {
    if (map.hasKey(key) && !map.isNull(key) && map.getType(key) == ReadableType.Number) {
      editor.putInt(key, map.getDouble(key).toLong().toInt())
    }
  }

  fun resolve(context: Context): SplashPalette {
    val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val themeMode = prefs.getString("themeMode", "system") ?: "system"
    val systemDark = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
      Configuration.UI_MODE_NIGHT_YES
    val isDark = when (themeMode) {
      "dark" -> true
      "light" -> false
      else -> systemDark
    }
    val isCustomSeed = prefs.getBoolean("isCustomSeed", false)

    return if (isDark) {
      SplashPalette(
        isDark = true,
        isCustomSeed = isCustomSeed,
        backgroundColor = prefs.getInt("backgroundDark", DEFAULT_BG_DARK),
        primaryColor = prefs.getInt("primaryDark", DEFAULT_PRIMARY_DARK),
        secondaryColor = prefs.getInt("secondaryDark", DEFAULT_SECONDARY_DARK),
        onSurfaceColor = prefs.getInt("onSurfaceDark", DEFAULT_ON_SURFACE_DARK),
      )
    } else {
      SplashPalette(
        isDark = false,
        isCustomSeed = isCustomSeed,
        backgroundColor = prefs.getInt("backgroundLight", DEFAULT_BG_LIGHT),
        primaryColor = prefs.getInt("primaryLight", DEFAULT_PRIMARY_LIGHT),
        secondaryColor = prefs.getInt("secondaryLight", DEFAULT_SECONDARY_LIGHT),
        onSurfaceColor = prefs.getInt("onSurfaceLight", DEFAULT_ON_SURFACE_LIGHT),
      )
    }
  }
}
