package cn.toside.music.mobile.crypto

import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher

object RSA {
  @JvmStatic
  fun getKeyPair(): KeyPair? {
    return try {
      val kpg = KeyPairGenerator.getInstance("RSA")
      kpg.initialize(2048)
      kpg.generateKeyPair()
    } catch (e: Exception) {
      e.printStackTrace()
      null
    }
  }

  @JvmStatic
  fun encryptRSAToString(decryptedBase64: String, publicKey: String, padding: String): String {
    return try {
      val keyFac = KeyFactory.getInstance("RSA")
      val keyBytes = Base64.decode(publicKey.trim().toByteArray(StandardCharsets.UTF_8), Base64.DEFAULT)
      val key = keyFac.generatePublic(X509EncodedKeySpec(keyBytes))
      val cipher = Cipher.getInstance(padding)
      cipher.init(Cipher.ENCRYPT_MODE, key)
      val encryptedBytes = cipher.doFinal(Base64.decode(decryptedBase64, Base64.DEFAULT))
      String(Base64.encode(encryptedBytes, Base64.NO_WRAP), StandardCharsets.UTF_8)
    } catch (e: Exception) {
      e.printStackTrace()
      ""
    }
  }

  @JvmStatic
  fun decryptRSAToString(encryptedBase64: String, privateKey: String, padding: String): String {
    return try {
      val keyFac = KeyFactory.getInstance("RSA")
      val keyBytes = Base64.decode(privateKey.trim().toByteArray(StandardCharsets.UTF_8), Base64.DEFAULT)
      val key = keyFac.generatePrivate(PKCS8EncodedKeySpec(keyBytes))
      val cipher = Cipher.getInstance(padding)
      cipher.init(Cipher.DECRYPT_MODE, key)
      val encryptedBytes = Base64.decode(encryptedBase64, Base64.DEFAULT)
      val decryptedBytes = cipher.doFinal(encryptedBytes)
      String(decryptedBytes, StandardCharsets.UTF_8)
    } catch (e: Exception) {
      e.printStackTrace()
      ""
    }
  }
}
