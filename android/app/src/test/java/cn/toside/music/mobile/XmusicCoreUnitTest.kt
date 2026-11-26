package cn.toside.music.mobile

import cn.toside.music.mobile.lyric.LyricLine
import cn.toside.music.mobile.lyric.LyricPlayer
import cn.toside.music.mobile.player.dsp.XmusicDspConfig
import cn.toside.music.mobile.storage.XmusicStorageEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

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
}
