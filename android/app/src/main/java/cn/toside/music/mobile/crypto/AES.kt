package cn.toside.music.mobile.crypto

import android.util.Base64
import java.nio.charset.StandardCharsets
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.math.min

object AES {
  private fun decodeBase64(data: String): ByteArray =
    Base64.decode(data, Base64.DEFAULT)

  private fun encodeBase64(data: ByteArray): String =
    String(Base64.encode(data, Base64.NO_WRAP), StandardCharsets.UTF_8)

  fun encrypt(data: ByteArray, key: ByteArray, iv: ByteArray, mode: String): String {
    return try {
      val cipher = Cipher.getInstance(mode)
      val secretKeySpec = SecretKeySpec(key, "AES")
      val finalIvs = ByteArray(16)
      val len = min(iv.size, 16)
      System.arraycopy(iv, 0, finalIvs, 0, len)
      cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, IvParameterSpec(finalIvs))
      encodeBase64(cipher.doFinal(data))
    } catch (e: Exception) {
      e.printStackTrace()
      ""
    }
  }

  fun encrypt(data: ByteArray, key: ByteArray, mode: String): String {
    return try {
      val cipher = Cipher.getInstance(mode)
      val secretKeySpec = SecretKeySpec(key, "AES")
      cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec)
      encodeBase64(cipher.doFinal(data))
    } catch (e: Exception) {
      e.printStackTrace()
      ""
    }
  }

  @JvmStatic
  fun encrypt(data: String, key: String, iv: String, mode: String): String {
    return if (iv.isEmpty()) {
      encrypt(decodeBase64(data), decodeBase64(key), mode)
    } else {
      encrypt(decodeBase64(data), decodeBase64(key), decodeBase64(iv), mode)
    }
  }

  fun decrypt(data: ByteArray, key: ByteArray, iv: ByteArray, mode: String): String {
    return try {
      val cipher = Cipher.getInstance(mode)
      val secretKeySpec = SecretKeySpec(key, "AES")
      val finalIvs = ByteArray(16)
      val len = min(iv.size, 16)
      System.arraycopy(iv, 0, finalIvs, 0, len)
      cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, IvParameterSpec(finalIvs))
      String(cipher.doFinal(data), StandardCharsets.UTF_8)
    } catch (e: Exception) {
      e.printStackTrace()
      ""
    }
  }

  fun decrypt(data: ByteArray, key: ByteArray, mode: String): String {
    return try {
      val cipher = Cipher.getInstance(mode)
      val secretKeySpec = SecretKeySpec(key, "AES")
      cipher.init(Cipher.DECRYPT_MODE, secretKeySpec)
      String(cipher.doFinal(data), StandardCharsets.UTF_8)
    } catch (e: Exception) {
      e.printStackTrace()
      ""
    }
  }

  @JvmStatic
  fun decrypt(data: String, key: String, iv: String, mode: String): String {
    return if (iv.isEmpty()) {
      decrypt(decodeBase64(data), decodeBase64(key), mode)
    } else {
      decrypt(decodeBase64(data), decodeBase64(key), decodeBase64(iv), mode)
    }
  }
}
