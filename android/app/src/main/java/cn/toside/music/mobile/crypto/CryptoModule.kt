package cn.toside.music.mobile.crypto

import android.util.Base64
import cn.toside.music.mobile.core.ModuleCoroutineScope
import cn.toside.music.mobile.core.launchCatching
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlinx.coroutines.Dispatchers
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.spec.PKCS8EncodedKeySpec

class CryptoModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val coroutineScope = ModuleCoroutineScope()

  override fun getName(): String = "CryptoModule"

  override fun invalidate() {
    coroutineScope.cancel()
    super.invalidate()
  }

  @ReactMethod
  fun generateRsaKey(promise: Promise) {
    promise.launchCatching(coroutineScope.scope, Dispatchers.Default, errorCode = "-1") {
      val kp = RSA.getKeyPair() ?: throw IllegalStateException("Failed to generate RSA key pair")
      val publicKeyBase64 = String(Base64.encode(kp.public.encoded, Base64.DEFAULT), StandardCharsets.UTF_8)
      val keyFac = KeyFactory.getInstance("RSA")
      val privateKey = keyFac.generatePrivate(PKCS8EncodedKeySpec(kp.private.encoded))
      val privateKeyBase64 = String(Base64.encode(privateKey.encoded, Base64.DEFAULT), StandardCharsets.UTF_8)
      Arguments.createMap().apply {
        putString("publicKey", publicKeyBase64)
        putString("privateKey", privateKeyBase64)
      }
    }
  }

  @ReactMethod
  fun rsaEncrypt(text: String, key: String, padding: String, promise: Promise) {
    promise.resolve(RSA.encryptRSAToString(text, key, padding))
  }

  @ReactMethod
  fun rsaDecrypt(text: String, key: String, padding: String, promise: Promise) {
    promise.resolve(RSA.decryptRSAToString(text, key, padding))
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun rsaEncryptSync(text: String, key: String, padding: String): String =
    RSA.encryptRSAToString(text, key, padding)

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun rsaDecryptSync(text: String, key: String, padding: String): String =
    RSA.decryptRSAToString(text, key, padding)

  @ReactMethod
  fun aesEncrypt(text: String, key: String, iv: String, mode: String, promise: Promise) {
    promise.resolve(AES.encrypt(text, key, iv, mode))
  }

  @ReactMethod
  fun aesDecrypt(text: String, key: String, iv: String, mode: String, promise: Promise) {
    promise.resolve(AES.decrypt(text, key, iv, mode))
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun aesEncryptSync(text: String, key: String, iv: String, mode: String): String =
    AES.encrypt(text, key, iv, mode)

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun aesDecryptSync(text: String, key: String, iv: String, mode: String): String =
    AES.decrypt(text, key, iv, mode)

  @ReactMethod
  fun sha1(input: String, promise: Promise) {
    try {
      val md = MessageDigest.getInstance("SHA-1")
      val digest = md.digest(input.toByteArray(StandardCharsets.UTF_8))
      val hex = StringBuilder(digest.size * 2)
      for (b in digest) {
        val h = Integer.toHexString(0xFF and b.toInt())
        if (h.length == 1) hex.append('0')
        hex.append(h)
      }
      promise.resolve(hex.toString())
    } catch (e: Exception) {
      promise.reject("SHA1_ERROR", "哈希计算失败", e)
    }
  }
}
