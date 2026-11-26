package cn.toside.music.mobile.storage

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

/**
 * High-performance SQLite WAL key-value store with transparent file-overflow storage
 * for payloads exceeding [INLINE_MAX_CHARS], completely eliminating Android's 2MB
 * CursorWindow limit and JS-side 500KB string sharding.
 *
 * Automatically performs one-time lossless migration from legacy AsyncStorage
 * databases (`RKStorage` / `AsyncStorage`), including `@___PART___` and `@___PART_A___` shards.
 */
class XmusicStorageEngine private constructor(
  appContext: Context,
) : SQLiteOpenHelper(appContext, DB_NAME, null, DB_VERSION) {

  companion object {
    private const val TAG = "XmusicStorageEngine"
    private const val DB_NAME = "xmusic_kv.db"
    private const val DB_VERSION = 1
    private const val TABLE_KV = "kv_store"
    private const val TABLE_META = "kv_meta"
    private const val META_MIGRATED_KEY = "legacy_migrated_v1"

    private const val PART_KEY_PREFIX = "@___PART___"
    private const val PART_KEY_ARR_PREFIX = "@___PART_A___"
    private const val INLINE_MAX_CHARS = 262_144
    private const val BLOB_DIR_NAME = "xmusic_kv_blobs"

    @Volatile
    private var instance: XmusicStorageEngine? = null

    fun getInstance(context: Context): XmusicStorageEngine {
      return instance ?: synchronized(this) {
        instance ?: XmusicStorageEngine(context.applicationContext).also { instance = it }
      }
    }

    /**
     * Reassemble legacy sharded entries (`@___PART___` and `@___PART_A___`) into flat key-value pairs.
     * Pure helper exposed for unit testing.
     */
    internal fun reassembleLegacyEntries(rawMap: Map<String, String>): Map<String, String> {
      val shardKeys = HashSet<String>()
      for ((_, value) in rawMap) {
        when {
          value.startsWith(PART_KEY_ARR_PREFIX) -> {
            parseJsonStringArray(value.removePrefix(PART_KEY_ARR_PREFIX))?.forEach { shardKeys.add(it) }
          }
          value.startsWith(PART_KEY_PREFIX) -> {
            value.removePrefix(PART_KEY_PREFIX).split(',').forEach {
              if (it.isNotEmpty()) shardKeys.add(it)
            }
          }
        }
      }

      val result = LinkedHashMap<String, String>(rawMap.size)
      for ((key, value) in rawMap) {
        if (key in shardKeys || key.startsWith(PART_KEY_PREFIX) || key.startsWith(PART_KEY_ARR_PREFIX)) {
          continue
        }
        when {
          value.startsWith(PART_KEY_ARR_PREFIX) -> {
            val parts = parseJsonStringArray(value.removePrefix(PART_KEY_ARR_PREFIX))
            if (parts != null) {
              val assembled = concatParts(parts, rawMap)
              if (assembled != null) result[key] = assembled
            }
          }
          value.startsWith(PART_KEY_PREFIX) -> {
            val parts = value.removePrefix(PART_KEY_PREFIX).split(',').filter { it.isNotEmpty() }
            val assembled = concatParts(parts, rawMap)
            if (assembled != null) result[key] = assembled
          }
          else -> result[key] = value
        }
      }
      return result
    }

    private fun parseJsonStringArray(jsonStr: String): List<String>? {
      return try {
        val arr = JSONArray(jsonStr)
        List(arr.length()) { idx -> arr.optString(idx, "") }.filter { it.isNotEmpty() }
      } catch (_: Exception) {
        null
      }
    }

    private fun concatParts(parts: List<String>, rawMap: Map<String, String>): String? {
      if (parts.isEmpty()) return null
      val sb = StringBuilder()
      for (partKey in parts) {
        val chunk = rawMap[partKey] ?: return null
        sb.append(chunk)
      }
      return sb.toString()
    }
  }

  private val appContext: Context = appContext.applicationContext
  private val blobDir: File = File(this.appContext.filesDir, BLOB_DIR_NAME)
  private val ioLock = Any()

  @Volatile
  private var migrationChecked = false

  override fun onConfigure(db: SQLiteDatabase) {
    super.onConfigure(db)
    db.enableWriteAheadLogging()
    try {
      db.rawQuery("PRAGMA synchronous = NORMAL", null).use { }
    } catch (_: Exception) {}
  }

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
      "CREATE TABLE IF NOT EXISTS $TABLE_KV (" +
        "k TEXT PRIMARY KEY NOT NULL, " +
        "v TEXT, " +
        "blob_file TEXT" +
        ")"
    )
    db.execSQL(
      "CREATE TABLE IF NOT EXISTS $TABLE_META (" +
        "k TEXT PRIMARY KEY NOT NULL, " +
        "v TEXT NOT NULL" +
        ")"
    )
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    onCreate(db)
  }

  private fun ensureReady(): SQLiteDatabase {
    val db = writableDatabase
    if (!migrationChecked) {
      synchronized(ioLock) {
        if (!migrationChecked) {
          migrateLegacyIfNeeded(db)
          migrationChecked = true
        }
      }
    }
    return db
  }

  private fun migrateLegacyIfNeeded(db: SQLiteDatabase) {
    val alreadyMigrated = db.rawQuery(
      "SELECT v FROM $TABLE_META WHERE k = ?",
      arrayOf(META_MIGRATED_KEY),
    ).use { cursor ->
      cursor.moveToFirst() && cursor.getString(0) == "1"
    }
    if (alreadyMigrated) return

    val rawLegacy = LinkedHashMap<String, String>()
    // Read older RKStorage first, then newer Room-based AsyncStorage so newer entries win on conflict.
    readLegacyDb(appContext.getDatabasePath("RKStorage"), "catalystLocalStorage", rawLegacy)
    readLegacyDb(appContext.getDatabasePath("AsyncStorage"), "Storage", rawLegacy)

    if (rawLegacy.isNotEmpty()) {
      val assembled = reassembleLegacyEntries(rawLegacy)
      db.beginTransaction()
      try {
        for ((k, v) in assembled) {
          writeEntryLocked(db, k, v)
        }
        markLegacyMigrated(db)
        db.setTransactionSuccessful()
        Log.i(TAG, "Migrated ${assembled.size} entries from legacy AsyncStorage")
      } catch (e: Exception) {
        Log.e(TAG, "Legacy migration failed; will retry on next launch", e)
        throw e
      } finally {
        db.endTransaction()
      }
    } else {
      markLegacyMigrated(db)
    }
  }

  private fun markLegacyMigrated(db: SQLiteDatabase) {
    val meta = ContentValues().apply {
      put("k", META_MIGRATED_KEY)
      put("v", "1")
    }
    db.insertWithOnConflict(TABLE_META, null, meta, SQLiteDatabase.CONFLICT_REPLACE)
  }

  private fun readLegacyDb(
    dbFile: File,
    tableName: String,
    out: MutableMap<String, String>,
  ) {
    if (!dbFile.exists() || dbFile.length() == 0L) return
    var legacyDb: SQLiteDatabase? = null
    try {
      legacyDb = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
      val tableExists = legacyDb.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        arrayOf(tableName),
      ).use { it.moveToFirst() }
      if (!tableExists) return

      val largeKeys = ArrayList<Pair<String, Int>>()
      legacyDb.rawQuery(
        "SELECT key, CASE WHEN LENGTH(value) <= $INLINE_MAX_CHARS THEN value ELSE NULL END, LENGTH(value) " +
          "FROM $tableName WHERE key IS NOT NULL AND value IS NOT NULL",
        null,
      ).use { cursor ->
        while (cursor.moveToNext()) {
          val key = cursor.getString(0) ?: continue
          val inlineVal = if (cursor.isNull(1)) null else cursor.getString(1)
          val totalLen = cursor.getInt(2)
          if (inlineVal != null) {
            out[key] = inlineVal
          } else if (totalLen > 0) {
            largeKeys.add(key to totalLen)
          }
        }
      }

      for ((key, totalLen) in largeKeys) {
        val sb = StringBuilder(totalLen)
        var offset = 1 // SQLite SUBSTR is 1-based
        while (offset <= totalLen) {
          val chunk = legacyDb.rawQuery(
            "SELECT SUBSTR(value, ?, ?) FROM $tableName WHERE key = ?",
            arrayOf(offset.toString(), INLINE_MAX_CHARS.toString(), key),
          ).use { c -> if (c.moveToFirst()) c.getString(0) else null }
          if (chunk.isNullOrEmpty()) break
          sb.append(chunk)
          offset += INLINE_MAX_CHARS
        }
        out[key] = sb.toString()
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed reading legacy db ${dbFile.name}:$tableName", e)
    } finally {
      try { legacyDb?.close() } catch (_: Exception) {}
    }
  }

  fun getItem(key: String): String? {
    synchronized(ioLock) {
      val db = ensureReady()
      return readEntryLocked(db, key)
    }
  }

  fun setItem(key: String, value: String) {
    synchronized(ioLock) {
      val db = ensureReady()
      db.beginTransaction()
      try {
        writeEntryLocked(db, key, value)
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }
  }

  fun removeItem(key: String) {
    synchronized(ioLock) {
      val db = ensureReady()
      db.beginTransaction()
      try {
        removeEntryLocked(db, key)
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }
  }

  fun getAllKeys(): List<String> {
    synchronized(ioLock) {
      val db = ensureReady()
      val keys = ArrayList<String>()
      db.rawQuery("SELECT k FROM $TABLE_KV", null).use { cursor ->
        while (cursor.moveToNext()) {
          cursor.getString(0)?.let { keys.add(it) }
        }
      }
      return keys
    }
  }

  fun multiGet(keys: List<String>): List<Pair<String, String?>> {
    if (keys.isEmpty()) return emptyList()
    synchronized(ioLock) {
      val db = ensureReady()
      val results = ArrayList<Pair<String, String?>>(keys.size)
      for (key in keys) {
        results.add(key to readEntryLocked(db, key))
      }
      return results
    }
  }

  fun multiSet(entries: List<Pair<String, String>>) {
    if (entries.isEmpty()) return
    synchronized(ioLock) {
      val db = ensureReady()
      db.beginTransaction()
      try {
        for ((k, v) in entries) {
          writeEntryLocked(db, k, v)
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }
  }

  fun multiRemove(keys: List<String>) {
    if (keys.isEmpty()) return
    synchronized(ioLock) {
      val db = ensureReady()
      db.beginTransaction()
      try {
        for (k in keys) {
          removeEntryLocked(db, k)
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }
  }

  fun clear() {
    synchronized(ioLock) {
      val db = ensureReady()
      db.beginTransaction()
      try {
        db.delete(TABLE_KV, null, null)
        markLegacyMigrated(db)
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      if (blobDir.exists()) {
        blobDir.listFiles()?.forEach { file ->
          try { file.delete() } catch (_: Exception) {}
        }
      }
    }
  }

  private fun readEntryLocked(db: SQLiteDatabase, key: String): String? {
    db.rawQuery(
      "SELECT v, blob_file FROM $TABLE_KV WHERE k = ?",
      arrayOf(key),
    ).use { cursor ->
      if (!cursor.moveToFirst()) return null
      val inlineVal = if (cursor.isNull(0)) null else cursor.getString(0)
      if (inlineVal != null) return inlineVal
      val blobFileName = if (cursor.isNull(1)) null else cursor.getString(1)
      if (blobFileName.isNullOrEmpty()) return null
      val blobFile = File(blobDir, blobFileName)
      if (!blobFile.exists()) return null
      return try {
        blobFile.readText(StandardCharsets.UTF_8)
      } catch (_: Exception) {
        null
      }
    }
  }

  private fun writeEntryLocked(db: SQLiteDatabase, key: String, value: String) {
    val existingBlob = db.rawQuery(
      "SELECT blob_file FROM $TABLE_KV WHERE k = ?",
      arrayOf(key),
    ).use { c -> if (c.moveToFirst() && !c.isNull(0)) c.getString(0) else null }

    if (value.length <= INLINE_MAX_CHARS) {
      val cv = ContentValues().apply {
        put("k", key)
        put("v", value)
        putNull("blob_file")
      }
      db.insertWithOnConflict(TABLE_KV, null, cv, SQLiteDatabase.CONFLICT_REPLACE)
      if (!existingBlob.isNullOrEmpty()) {
        try { File(blobDir, existingBlob).delete() } catch (_: Exception) {}
      }
    } else {
      if (!blobDir.exists()) blobDir.mkdirs()
      val fileName = "${sha256Hex(key)}.dat"
      val tmpFile = File(blobDir, "$fileName.tmp")
      val targetFile = File(blobDir, fileName)
      FileOutputStream(tmpFile).use { fos ->
        fos.write(value.toByteArray(StandardCharsets.UTF_8))
        fos.flush()
      }
      if (targetFile.exists()) targetFile.delete()
      if (!tmpFile.renameTo(targetFile)) {
        tmpFile.delete()
        throw IllegalStateException("Failed to write storage blob for key: $key")
      }
      val cv = ContentValues().apply {
        put("k", key)
        putNull("v")
        put("blob_file", fileName)
      }
      db.insertWithOnConflict(TABLE_KV, null, cv, SQLiteDatabase.CONFLICT_REPLACE)
      if (!existingBlob.isNullOrEmpty() && existingBlob != fileName) {
        try { File(blobDir, existingBlob).delete() } catch (_: Exception) {}
      }
    }
  }

  private fun removeEntryLocked(db: SQLiteDatabase, key: String) {
    val existingBlob = db.rawQuery(
      "SELECT blob_file FROM $TABLE_KV WHERE k = ?",
      arrayOf(key),
    ).use { c -> if (c.moveToFirst() && !c.isNull(0)) c.getString(0) else null }

    db.delete(TABLE_KV, "k = ?", arrayOf(key))
    if (!existingBlob.isNullOrEmpty()) {
      try { File(blobDir, existingBlob).delete() } catch (_: Exception) {}
    }
  }

  private fun sha256Hex(input: String): String {
    val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(StandardCharsets.UTF_8))
    val sb = StringBuilder(bytes.size * 2)
    for (b in bytes) {
      sb.append(String.format("%02x", b))
    }
    return sb.toString()
  }
}
