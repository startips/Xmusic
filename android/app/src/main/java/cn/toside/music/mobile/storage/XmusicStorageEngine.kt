package cn.toside.music.mobile.storage

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicLong

/**
 * High-performance SQLite WAL storage engine combining:
 * 1) Key-value store with transparent versioned file-overflow storage (> 256K chars),
 *    eliminating Android's 2MB CursorWindow limit and legacy AsyncStorage sharding.
 * 2) Relational `playlist_tracks` table enabling O(k) add/remove/update/reorder mutations
 *    without re-serializing entire multi-thousand-song playlists, with lazy lossless migration
 *    from legacy `@list__<id>` JSON blobs.
 */
class XmusicStorageEngine private constructor(
  appContext: Context,
) : SQLiteOpenHelper(appContext, DB_NAME, null, DB_VERSION) {

  companion object {
    private const val TAG = "XmusicStorageEngine"
    private const val DB_NAME = "xmusic_kv.db"
    private const val DB_VERSION = 2
    private const val TABLE_KV = "kv_store"
    private const val TABLE_META = "kv_meta"
    private const val TABLE_PLAYLIST_TRACKS = "playlist_tracks"
    private const val META_MIGRATED_KEY = "legacy_migrated_v1"
    private const val LEGACY_LIST_PREFIX = "@list__"

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

    /**
     * Extract ordered (trackId, rawJsonPayload) pairs from a serialized JSON array of tracks.
     * Pure helper exposed for unit testing.
     */
    internal fun parsePlaylistJsonEntries(tracksJsonArray: String): List<Pair<String, String>> {
      if (tracksJsonArray.isBlank()) return emptyList()
      return try {
        val arr = JSONArray(tracksJsonArray)
        val out = ArrayList<Pair<String, String>>(arr.length())
        val seen = HashSet<String>(arr.length())
        for (i in 0 until arr.length()) {
          val obj = arr.optJSONObject(i) ?: continue
          val id = obj.optString("id", "")
          if (id.isEmpty() || !seen.add(id)) continue
          out.add(id to obj.toString())
        }
        out
      } catch (e: Exception) {
        Log.w(TAG, "Failed parsing playlist JSON array: ${e.message}")
        emptyList()
      }
    }

    /**
     * Compute deterministic O(k) insertion positions for adding [count] tracks without shifting existing rows.
     * Pure helper exposed for unit testing.
     */
    internal fun computeInsertPositions(
      minPos: Long?,
      maxPos: Long?,
      count: Int,
      atTop: Boolean,
    ): LongArray {
      if (count <= 0) return LongArray(0)
      return if (atTop) {
        val base = (minPos ?: 0L) - count.toLong()
        LongArray(count) { idx -> base + idx.toLong() }
      } else {
        val base = (maxPos ?: -1L) + 1L
        LongArray(count) { idx -> base + idx.toLong() }
      }
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
  private val migrationLock = Any()
  private val writeLock = Any()
  private val blobSeq = AtomicLong(0L)

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
    db.execSQL(
      "CREATE TABLE IF NOT EXISTS $TABLE_PLAYLIST_TRACKS (" +
        "list_id TEXT NOT NULL, " +
        "track_id TEXT NOT NULL, " +
        "pos INTEGER NOT NULL, " +
        "payload TEXT NOT NULL, " +
        "PRIMARY KEY (list_id, track_id)" +
        ")"
    )
    db.execSQL(
      "CREATE INDEX IF NOT EXISTS idx_playlist_tracks_order " +
        "ON $TABLE_PLAYLIST_TRACKS (list_id, pos)"
    )
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    onCreate(db)
  }

  private fun ensureReady(): SQLiteDatabase {
    val db = writableDatabase
    if (!migrationChecked) {
      synchronized(migrationLock) {
        if (!migrationChecked) {
          cleanupStaleTempBlobs()
          migrateLegacyIfNeeded(db)
          migrationChecked = true
        }
      }
    }
    return db
  }

  private fun cleanupStaleTempBlobs() {
    if (!blobDir.exists()) return
    blobDir.listFiles()?.forEach { file ->
      if (file.name.endsWith(".tmp")) {
        try { file.delete() } catch (_: Exception) {}
      }
    }
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
      val obsoleteBlobs = ArrayList<String>()
      db.beginTransaction()
      try {
        for ((k, v) in assembled) {
          writeEntryLocked(db, k, v, obsoleteBlobs)
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
      deleteBlobFilesQuietly(obsoleteBlobs)
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
        var offset = 1
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

  // ---- Generic Key-Value Store ----

  fun getItem(key: String): String? {
    val db = ensureReady()
    return readEntry(db, key)
  }

  fun setItem(key: String, value: String) {
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>(1)
      db.beginTransaction()
      try {
        writeEntryLocked(db, key, value, obsoleteBlobs)
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun removeItem(key: String) {
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>(1)
      db.beginTransaction()
      try {
        removeEntryLocked(db, key, obsoleteBlobs)
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun getAllKeys(): List<String> {
    val db = ensureReady()
    val keys = ArrayList<String>()
    db.rawQuery("SELECT k FROM $TABLE_KV", null).use { cursor ->
      while (cursor.moveToNext()) {
        cursor.getString(0)?.let { keys.add(it) }
      }
    }
    return keys
  }

  fun multiGet(keys: List<String>): List<Pair<String, String?>> {
    if (keys.isEmpty()) return emptyList()
    val db = ensureReady()
    val results = ArrayList<Pair<String, String?>>(keys.size)
    for (key in keys) {
      results.add(key to readEntry(db, key))
    }
    return results
  }

  fun multiSet(entries: List<Pair<String, String>>) {
    if (entries.isEmpty()) return
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>()
      db.beginTransaction()
      try {
        for ((k, v) in entries) {
          writeEntryLocked(db, k, v, obsoleteBlobs)
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun multiRemove(keys: List<String>) {
    if (keys.isEmpty()) return
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>()
      db.beginTransaction()
      try {
        for (k in keys) {
          removeEntryLocked(db, k, obsoleteBlobs)
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun clear() {
    synchronized(writeLock) {
      val db = ensureReady()
      db.beginTransaction()
      try {
        db.delete(TABLE_KV, null, null)
        db.delete(TABLE_PLAYLIST_TRACKS, null, null)
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

  // ---- Relational Playlist Engine (O(k) mutations + transparent legacy migration) ----

  private fun hasLegacyPlaylistBlob(db: SQLiteDatabase, listId: String): Boolean {
    return db.rawQuery(
      "SELECT 1 FROM $TABLE_KV WHERE k = ? LIMIT 1",
      arrayOf("$LEGACY_LIST_PREFIX$listId"),
    ).use { it.moveToFirst() }
  }

  private fun migrateLegacyPlaylistIfNeeded(db: SQLiteDatabase, listId: String) {
    if (!hasLegacyPlaylistBlob(db, listId)) return
    synchronized(writeLock) {
      val obsoleteBlobs = ArrayList<String>(1)
      db.beginTransaction()
      try {
        migrateLegacyPlaylistInTransaction(db, listId, obsoleteBlobs)
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  private fun migrateLegacyPlaylistInTransaction(
    db: SQLiteDatabase,
    listId: String,
    obsoleteBlobs: MutableList<String>,
  ) {
    val legacyKey = "$LEGACY_LIST_PREFIX$listId"
    val rawJson = readEntry(db, legacyKey) ?: return
    val existingCount = db.rawQuery(
      "SELECT COUNT(*) FROM $TABLE_PLAYLIST_TRACKS WHERE list_id = ?",
      arrayOf(listId),
    ).use { c -> if (c.moveToFirst()) c.getLong(0) else 0L }

    if (existingCount == 0L) {
      val entries = parsePlaylistJsonEntries(rawJson)
      if (entries.isNotEmpty()) {
        val stmt = db.compileStatement(
          "INSERT OR REPLACE INTO $TABLE_PLAYLIST_TRACKS (list_id, track_id, pos, payload) VALUES (?, ?, ?, ?)"
        )
        try {
          for (i in entries.indices) {
            val (trackId, payload) = entries[i]
            stmt.clearBindings()
            stmt.bindString(1, listId)
            stmt.bindString(2, trackId)
            stmt.bindLong(3, i.toLong())
            stmt.bindString(4, payload)
            stmt.executeInsert()
          }
        } finally {
          stmt.close()
        }
        Log.i(TAG, "Migrated legacy playlist '$listId' (${entries.size} tracks) to relational table")
      }
    }
    removeEntryLocked(db, legacyKey, obsoleteBlobs)
  }

  fun getPlaylistTracksJson(listId: String): String {
    val db = ensureReady()
    migrateLegacyPlaylistIfNeeded(db, listId)
    val sb = StringBuilder(4096)
    sb.append('[')
    var first = true
    db.rawQuery(
      "SELECT payload FROM $TABLE_PLAYLIST_TRACKS WHERE list_id = ? ORDER BY pos ASC",
      arrayOf(listId),
    ).use { cursor ->
      while (cursor.moveToNext()) {
        val payload = cursor.getString(0) ?: continue
        if (!first) sb.append(',')
        first = false
        sb.append(payload)
      }
    }
    sb.append(']')
    return sb.toString()
  }

  fun overwritePlaylistTracks(listId: String, tracksJsonArray: String) {
    val entries = parsePlaylistJsonEntries(tracksJsonArray)
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>(1)
      db.beginTransaction()
      try {
        db.delete(TABLE_PLAYLIST_TRACKS, "list_id = ?", arrayOf(listId))
        removeEntryLocked(db, "$LEGACY_LIST_PREFIX$listId", obsoleteBlobs)
        if (entries.isNotEmpty()) {
          val stmt = db.compileStatement(
            "INSERT OR REPLACE INTO $TABLE_PLAYLIST_TRACKS (list_id, track_id, pos, payload) VALUES (?, ?, ?, ?)"
          )
          try {
            for (i in entries.indices) {
              val (trackId, payload) = entries[i]
              stmt.clearBindings()
              stmt.bindString(1, listId)
              stmt.bindString(2, trackId)
              stmt.bindLong(3, i.toLong())
              stmt.bindString(4, payload)
              stmt.executeInsert()
            }
          } finally {
            stmt.close()
          }
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun addPlaylistTracks(listId: String, tracksJsonArray: String, atTop: Boolean) {
    val entries = parsePlaylistJsonEntries(tracksJsonArray)
    if (entries.isEmpty()) return
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>(1)
      db.beginTransaction()
      try {
        migrateLegacyPlaylistInTransaction(db, listId, obsoleteBlobs)
        var minPos: Long? = null
        var maxPos: Long? = null
        db.rawQuery(
          "SELECT MIN(pos), MAX(pos) FROM $TABLE_PLAYLIST_TRACKS WHERE list_id = ?",
          arrayOf(listId),
        ).use { c ->
          if (c.moveToFirst()) {
            if (!c.isNull(0)) minPos = c.getLong(0)
            if (!c.isNull(1)) maxPos = c.getLong(1)
          }
        }
        val positions = computeInsertPositions(minPos, maxPos, entries.size, atTop)
        val stmt = db.compileStatement(
          "INSERT OR IGNORE INTO $TABLE_PLAYLIST_TRACKS (list_id, track_id, pos, payload) VALUES (?, ?, ?, ?)"
        )
        try {
          for (i in entries.indices) {
            val (trackId, payload) = entries[i]
            stmt.clearBindings()
            stmt.bindString(1, listId)
            stmt.bindString(2, trackId)
            stmt.bindLong(3, positions[i])
            stmt.bindString(4, payload)
            stmt.executeInsert()
          }
        } finally {
          stmt.close()
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun removePlaylistTracks(listId: String, trackIds: List<String>) {
    if (trackIds.isEmpty()) return
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>(1)
      db.beginTransaction()
      try {
        migrateLegacyPlaylistInTransaction(db, listId, obsoleteBlobs)
        val stmt = db.compileStatement(
          "DELETE FROM $TABLE_PLAYLIST_TRACKS WHERE list_id = ? AND track_id = ?"
        )
        try {
          for (trackId in trackIds) {
            stmt.clearBindings()
            stmt.bindString(1, listId)
            stmt.bindString(2, trackId)
            stmt.executeUpdateDelete()
          }
        } finally {
          stmt.close()
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun updatePlaylistTracks(updatesJsonArray: String) {
    if (updatesJsonArray.isBlank()) return
    val arr = try {
      JSONArray(updatesJsonArray)
    } catch (_: Exception) {
      return
    }
    if (arr.length() == 0) return

    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>()
      val migratedLists = HashSet<String>()
      db.beginTransaction()
      try {
        val stmt = db.compileStatement(
          "UPDATE $TABLE_PLAYLIST_TRACKS SET payload = ? WHERE list_id = ? AND track_id = ?"
        )
        try {
          for (i in 0 until arr.length()) {
            val item = arr.optJSONObject(i) ?: continue
            val listId = item.optString("id", "")
            val musicObj = item.optJSONObject("musicInfo") ?: continue
            val trackId = musicObj.optString("id", "")
            if (listId.isEmpty() || trackId.isEmpty()) continue
            if (migratedLists.add(listId)) {
              migrateLegacyPlaylistInTransaction(db, listId, obsoleteBlobs)
            }
            stmt.clearBindings()
            stmt.bindString(1, musicObj.toString())
            stmt.bindString(2, listId)
            stmt.bindString(3, trackId)
            stmt.executeUpdateDelete()
          }
        } finally {
          stmt.close()
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun reorderPlaylistTracks(listId: String, orderedTrackIds: List<String>) {
    if (orderedTrackIds.isEmpty()) return
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>(1)
      db.beginTransaction()
      try {
        migrateLegacyPlaylistInTransaction(db, listId, obsoleteBlobs)
        val stmt = db.compileStatement(
          "UPDATE $TABLE_PLAYLIST_TRACKS SET pos = ? WHERE list_id = ? AND track_id = ?"
        )
        try {
          for (i in orderedTrackIds.indices) {
            stmt.clearBindings()
            stmt.bindLong(1, i.toLong())
            stmt.bindString(2, listId)
            stmt.bindString(3, orderedTrackIds[i])
            stmt.executeUpdateDelete()
          }
        } finally {
          stmt.close()
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  fun clearPlaylistTracks(listIds: List<String>) {
    if (listIds.isEmpty()) return
    synchronized(writeLock) {
      val db = ensureReady()
      val obsoleteBlobs = ArrayList<String>(listIds.size)
      db.beginTransaction()
      try {
        for (listId in listIds) {
          db.delete(TABLE_PLAYLIST_TRACKS, "list_id = ?", arrayOf(listId))
          removeEntryLocked(db, "$LEGACY_LIST_PREFIX$listId", obsoleteBlobs)
        }
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
      deleteBlobFilesQuietly(obsoleteBlobs)
    }
  }

  // ---- Internal KV & Blob Helpers ----

  private fun readEntry(db: SQLiteDatabase, key: String): String? {
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

  private fun writeEntryLocked(
    db: SQLiteDatabase,
    key: String,
    value: String,
    obsoleteBlobs: MutableList<String>,
  ) {
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
        obsoleteBlobs.add(existingBlob)
      }
    } else {
      if (!blobDir.exists()) blobDir.mkdirs()
      val versionTag = "${System.currentTimeMillis()}_${blobSeq.incrementAndGet()}"
      val fileName = "${sha256Hex(key)}_$versionTag.dat"
      val tmpFile = File(blobDir, "$fileName.tmp")
      val targetFile = File(blobDir, fileName)
      FileOutputStream(tmpFile).use { fos ->
        fos.write(value.toByteArray(StandardCharsets.UTF_8))
        fos.flush()
      }
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
        obsoleteBlobs.add(existingBlob)
      }
    }
  }

  private fun removeEntryLocked(
    db: SQLiteDatabase,
    key: String,
    obsoleteBlobs: MutableList<String>,
  ) {
    val existingBlob = db.rawQuery(
      "SELECT blob_file FROM $TABLE_KV WHERE k = ?",
      arrayOf(key),
    ).use { c -> if (c.moveToFirst() && !c.isNull(0)) c.getString(0) else null }

    db.delete(TABLE_KV, "k = ?", arrayOf(key))
    if (!existingBlob.isNullOrEmpty()) {
      obsoleteBlobs.add(existingBlob)
    }
  }

  private fun deleteBlobFilesQuietly(fileNames: List<String>) {
    for (name in fileNames) {
      try {
        File(blobDir, name).delete()
      } catch (_: Exception) {}
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
