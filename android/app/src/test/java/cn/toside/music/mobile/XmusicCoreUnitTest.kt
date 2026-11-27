package cn.toside.music.mobile

import cn.toside.music.mobile.lyric.LyricLine
import cn.toside.music.mobile.lyric.LyricPlayer
import cn.toside.music.mobile.player.PlaybackRecoveryStore
import cn.toside.music.mobile.player.cache.PlayerMediaCache
import cn.toside.music.mobile.player.dsp.AudioSpectrumEngine
import cn.toside.music.mobile.player.dsp.XmusicDspConfig
import cn.toside.music.mobile.storage.XmusicStorageEngine
import cn.toside.music.mobile.userApi.QuickJsHttpClient
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.ServerSocket
import java.nio.charset.StandardCharsets
import java.util.Collections
import java.util.concurrent.Executors

class XmusicCoreUnitTest {
  @Test
  fun dspConfig_clampsValuesAndIncrementsVersion() {
    val beforeVer = XmusicDspConfig.getConfigVersion()
    XmusicDspConfig.updateConfig(
      isEnabled = true,
      nextBandsMb = intArrayOf(-2000, 2000, 300, -500, 0),
      nextBassStrength = 1500,
      nextLoudnessGainMb = -200,
    )
    val bandsOut = IntArray(5)
    val extraOut = IntArray(3)
    val afterVer = XmusicDspConfig.copySnapshot(bandsOut, extraOut)

    assertTrue(afterVer > beforeVer)
    assertTrue(XmusicDspConfig.isEnabled())
    assertEquals(-1500, bandsOut[0])
    assertEquals(1500, bandsOut[1])
    assertEquals(300, bandsOut[2])
    assertEquals(-500, bandsOut[3])
    assertEquals(0, bandsOut[4])
    assertEquals(1, extraOut[0])
    assertEquals(1000, extraOut[1])
    assertEquals(0, extraOut[2])
  }

  @Test
  fun lyricPlayer_parsesCentisecondLrcAndTranslations() {
    var parsed: List<LyricLine> = emptyList()
    val player = object : LyricPlayer() {
      override fun onSetLyric(lines: List<LyricLine>) {
        parsed = lines
      }
    }
    val lrc = """
      [ti:Test Song]
      [offset:100]
      [00:01.50]First line
      [00:03.25]Second line
    """.trimIndent()
    val trans = """
      [00:01.50]第一行
      [00:03.25]第二行
    """.trimIndent()

    player.setLyric(lrc, listOf(trans))
    assertEquals(2, parsed.size)
    assertEquals(1500, parsed[0].time)
    assertEquals("First line", parsed[0].text)
    assertEquals(listOf("第一行"), parsed[0].extendedLyrics)
    assertEquals(3250, parsed[1].time)
    assertEquals("Second line", parsed[1].text)
    assertEquals(listOf("第二行"), parsed[1].extendedLyrics)
  }

  @Test
  fun lyricPlayer_parsesMillisecondLrcWithLeadingZeros() {
    var parsed: List<LyricLine> = emptyList()
    val player = object : LyricPlayer() {
      override fun onSetLyric(lines: List<LyricLine>) {
        parsed = lines
      }
    }
    val lrc = """
      [00:01.050]Line A
      [00:03.250]Line B
    """.trimIndent()
    player.setLyric(lrc, emptyList())
    assertEquals(2, parsed.size)
    assertEquals(1050, parsed[0].time)
    assertEquals(3250, parsed[1].time)
  }

  @Test
  fun storageEngine_reassemblesLegacyShardsAndPreservesNormalKeys() {
    val raw = mapOf(
      "setting" to "{\"theme\":\"m3\"}",
      "list_a" to "@___PART_A___[\"list_a_0\",\"list_a_1\"]",
      "list_a_0" to "[{\"id\":\"1\"},",
      "list_a_1" to "{\"id\":\"2\"}]",
      "list_old" to "@___PART___list_old_0,list_old_1",
      "list_old_0" to "{\"old\":",
      "list_old_1" to "true}",
    )

    val assembled = XmusicStorageEngine.reassembleLegacyEntries(raw)
    assertEquals(3, assembled.size)
    assertEquals("{\"theme\":\"m3\"}", assembled["setting"])
    assertEquals("[{\"id\":\"1\"},{\"id\":\"2\"}]", assembled["list_a"])
    assertEquals("{\"old\":true}", assembled["list_old"])
    assertFalse(assembled.containsKey("list_a_0"))
    assertFalse(assembled.containsKey("list_old_0"))
  }

  @OptIn(ExperimentalCoroutinesApi::class)
  @Test
  fun storageWriteDispatcher_preservesStrictFifoOrder() = runBlocking {
    val fifo = Dispatchers.IO.limitedParallelism(1)
    val observed = Collections.synchronizedList(ArrayList<Int>())
    val jobs = (1..200).map { seq ->
      launch(fifo) {
        observed.add(seq)
      }
    }
    jobs.joinAll()
    assertEquals((1..200).toList(), observed)
  }

  @Test
  fun playerMediaCache_returnsFalseSafelyWhenUninitialized() {
    assertFalse(PlayerMediaCache.isCached("nonexistent_key"))
    assertFalse(PlayerMediaCache.isLeadingCached("nonexistent_key"))
  }

  @Test
  fun quickJsHttpClient_mergesHeadersCaseInsensitivelyAndEncodesForm() {
    val merged = QuickJsHttpClient.mergeHeadersCaseInsensitive(
      mapOf(
        "user-agent" to "CustomUA/1.0",
        "ACCEPT" to "text/plain",
        "X-Token" to "abc",
      )
    )
    assertEquals(3, merged.size)
    assertEquals("CustomUA/1.0", QuickJsHttpClient.findHeaderCI(merged, "User-Agent"))
    assertEquals("text/plain", QuickJsHttpClient.findHeaderCI(merged, "accept"))
    assertEquals("abc", merged["X-Token"])

    val encoded = QuickJsHttpClient.encodeFormUrlEncoded(
      JSONObject().put("q", "hello world").put("p", 2)
    )
    assertTrue(encoded.contains("q=hello%20world"))
    assertTrue(encoded.contains("p=2"))

    val parsedObj = QuickJsHttpClient.parseJsonOrRawString("{\"ok\":true,\"n\":42}")
    assertTrue(parsedObj is JSONObject)
    assertEquals(42, (parsedObj as JSONObject).getInt("n"))
    assertEquals("plain text", QuickJsHttpClient.parseJsonOrRawString("plain text"))
  }

  @Test
  fun quickJsHttpClient_executesLoopbackRequestAndSupportsCancel() = runBlocking {
    val server = ServerSocket(0)
    val port = server.localPort
    val pool = Executors.newCachedThreadPool()
    val serverThread = Thread {
      try {
        while (!server.isClosed) {
          val sock = server.accept()
          pool.execute {
            try {
              val reader = BufferedReader(InputStreamReader(sock.getInputStream(), StandardCharsets.UTF_8))
              val requestLine = reader.readLine() ?: ""
              while (true) {
                val line = reader.readLine() ?: break
                if (line.isEmpty()) break
              }
              if (requestLine.contains("/slow")) {
                Thread.sleep(5_000)
              }
              val body = "{\"status\":\"ok\",\"path\":\"$requestLine\"}"
              val resp = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: application/json\r\n" +
                "Content-Length: ${body.toByteArray(StandardCharsets.UTF_8).size}\r\n" +
                "Connection: close\r\n\r\n" +
                body
              sock.getOutputStream().write(resp.toByteArray(StandardCharsets.UTF_8))
              sock.getOutputStream().flush()
            } catch (_: Exception) {
            } finally {
              try { sock.close() } catch (_: Exception) {}
            }
          }
        }
      } catch (_: Exception) {}
    }
    serverThread.isDaemon = true
    serverThread.start()

    val client = QuickJsHttpClient()
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    try {
      val getRes = CompletableDeferred<Pair<String?, JSONObject?>>()
      client.execute("req-get", "http://127.0.0.1:$port/fast", JSONObject().put("method", "GET"), scope) { _, err, resp ->
        getRes.complete(err to resp)
      }
      val (err1, resp1) = getRes.await()
      assertNull(err1)
      assertNotNull(resp1)
      assertEquals(200, resp1!!.getInt("statusCode"))
      assertEquals("ok", resp1.getJSONObject("body").getString("status"))

      val cancelRes = CompletableDeferred<Pair<String?, JSONObject?>>()
      client.execute("req-slow", "http://127.0.0.1:$port/slow", JSONObject().put("timeout", 10_000), scope) { _, err, resp ->
        cancelRes.complete(err to resp)
      }
      kotlinx.coroutines.delay(150)
      client.cancel("req-slow")
      val (err2, resp2) = cancelRes.await()
      assertNotNull(err2)
      assertNull(resp2)
    } finally {
      client.cancelAll()
      scope.cancel()
      try { server.close() } catch (_: Exception) {}
      pool.shutdownNow()
    }
  }

  @Test
  fun storageEngine_parsesPlaylistEntriesAndComputesO1InsertPositions() {
    val json = """[{"id":"a","name":"Song A"},{"id":"b","name":"Song B"},{"id":"a","name":"Dup A"}]"""
    val parsed = XmusicStorageEngine.parsePlaylistJsonEntries(json)
    assertEquals(2, parsed.size)
    assertEquals("a", parsed[0].first)
    assertEquals("b", parsed[1].first)

    // Top insert into [0, 1] -> [-2, -1] (preserves order before 0 with zero shifts!)
    val topPos = XmusicStorageEngine.computeInsertPositions(minPos = 0L, maxPos = 1L, count = 2, atTop = true)
    assertEquals(listOf(-2L, -1L), topPos.toList())

    // Bottom insert into [-2, 1] -> [2, 3]
    val botPos = XmusicStorageEngine.computeInsertPositions(minPos = -2L, maxPos = 1L, count = 2, atTop = false)
    assertEquals(listOf(2L, 3L), botPos.toList())

    // Empty playlist insert
    val emptyBot = XmusicStorageEngine.computeInsertPositions(minPos = null, maxPos = null, count = 3, atTop = false)
    assertEquals(listOf(0L, 1L, 2L), emptyBot.toList())
  }

  @Test
  fun playbackRecoveryStore_roundTripsHeaders() {
    val serialized = PlaybackRecoveryStore.serializeHeaders(mapOf("Referer" to "https://example.com", "Cookie" to "a=1"))
    val deserialized = PlaybackRecoveryStore.deserializeHeaders(serialized)
    assertNotNull(deserialized)
    assertEquals("https://example.com", deserialized!!["Referer"])
    assertEquals("a=1", deserialized["Cookie"])
    assertNull(PlaybackRecoveryStore.deserializeHeaders(""))
  }

  @Test
  fun audioSpectrumEngine_detectsLowVsHighFrequencyTones() {
    AudioSpectrumEngine.reset()
    val sr = 48000
    val bands = FloatArray(AudioSpectrumEngine.BAND_COUNT)
    val energies = FloatArray(3)
    var ts = 1_000_000_000L

    // Feed 3 frames of 100 Hz bass tone
    for (i in 0 until AudioSpectrumEngine.FFT_SIZE * 3) {
      val s = (0.65 * sin(2.0 * PI * 100.0 * i / sr)).toFloat()
      ts += 20_833L
      AudioSpectrumEngine.pushMonoSample(s, sr, ts)
    }
    assertTrue(AudioSpectrumEngine.sampleSpectrum(bands, energies, ts + 180_000_000L))
    for (b in bands) assertTrue("Band out of [0,1]: $b", b in 0f..1f)
    assertTrue("Expected bass > treble for 100Hz, got bass=${energies[0]} treble=${energies[2]}", energies[0] > energies[2] + 0.2f)

    // Reset and feed 3 frames of 6000 Hz treble tone
    AudioSpectrumEngine.reset()
    for (i in 0 until AudioSpectrumEngine.FFT_SIZE * 3) {
      val s = (0.65 * sin(2.0 * PI * 6000.0 * i / sr)).toFloat()
      ts += 20_833L
      AudioSpectrumEngine.pushMonoSample(s, sr, ts)
    }
    assertTrue(AudioSpectrumEngine.sampleSpectrum(bands, energies, ts + 180_000_000L))
    assertTrue("Expected treble > bass for 6000Hz, got treble=${energies[2]} bass=${energies[0]}", energies[2] > energies[0] + 0.2f)
  }

  @Test
  fun audioSpectrumEngine_consumerRefCountAndPresenceCallback() {
    while (AudioSpectrumEngine.hasConsumers()) AudioSpectrumEngine.unregisterConsumer()
    val events = mutableListOf<Boolean>()
    AudioSpectrumEngine.onConsumerPresenceChanged = { events.add(it) }
    try {
      AudioSpectrumEngine.registerConsumer()
      AudioSpectrumEngine.registerConsumer()
      assertTrue(AudioSpectrumEngine.hasConsumers())
      AudioSpectrumEngine.unregisterConsumer()
      assertTrue(AudioSpectrumEngine.hasConsumers())
      AudioSpectrumEngine.unregisterConsumer()
      assertFalse(AudioSpectrumEngine.hasConsumers())
      // Extra unregister must not underflow
      AudioSpectrumEngine.unregisterConsumer()
      assertFalse(AudioSpectrumEngine.hasConsumers())
      assertEquals(listOf(true, false), events)
    } finally {
      AudioSpectrumEngine.onConsumerPresenceChanged = null
    }
  }

  @Test
  fun audioSpectrumEngine_latencyAlignedSamplingAndStaleDecay() {
    AudioSpectrumEngine.reset()
    val sr = 48000
    val bands = FloatArray(AudioSpectrumEngine.BAND_COUNT)
    val energies = FloatArray(3)
    var ts = 5_000_000_000L

    // Earlier burst: 100Hz bass around ts = 5.05s
    for (i in 0 until AudioSpectrumEngine.FFT_SIZE * 2) {
      ts += 20_833L
      AudioSpectrumEngine.pushMonoSample((0.6f * sin(2.0 * PI * 100.0 * i / sr)).toFloat(), sr, ts)
    }
    val bassFrameTs = ts

    // 180ms later burst: 7000Hz treble
    for (i in 0 until AudioSpectrumEngine.FFT_SIZE * 8) {
      ts += 20_833L
      AudioSpectrumEngine.pushMonoSample((0.6f * sin(2.0 * PI * 7000.0 * i / sr)).toFloat(), sr, ts)
    }

    // Sampling with 180ms A/V latency near bassFrameTs + 180ms should pick the earlier bass frame
    assertTrue(AudioSpectrumEngine.sampleSpectrum(bands, energies, nowNs = bassFrameTs + 180_000_000L, latencyNs = 180_000_000L))
    assertTrue("Expected latency-aligned bass frame, got bass=${energies[0]} treble=${energies[2]}", energies[0] > energies[2])

    // Past stale timeout -> returns false and zeros outputs
    assertFalse(AudioSpectrumEngine.sampleSpectrum(bands, energies, nowNs = ts + 1_000_000_000L, latencyNs = 180_000_000L))
    assertEquals(0f, energies[0], 0.0001f)
    assertEquals(0f, bands[0], 0.0001f)
  }
}
