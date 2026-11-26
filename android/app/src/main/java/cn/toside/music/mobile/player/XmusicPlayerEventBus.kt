package cn.toside.music.mobile.player

import android.os.Bundle
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import cn.toside.music.mobile.core.sendJsEvent

/**
 * Process-wide event bridge between [XmusicPlaybackService] / [XmusicPlayerController]
 * and the active [XmusicPlayerModule] RN instance.
 */
object XmusicPlayerEventBus {
  @Volatile
  private var reactContext: ReactApplicationContext? = null

  fun attach(context: ReactApplicationContext) {
    reactContext = context
  }

  fun detach(context: ReactApplicationContext) {
    if (reactContext === context) {
      reactContext = null
    }
  }

  fun emit(eventName: String, params: Bundle? = null) {
    val ctx = reactContext ?: return
    val map: WritableMap? = params?.let { Arguments.fromBundle(it) }
    ctx.sendJsEvent(eventName, map)
  }

  fun emitState(state: Int) {
    val ctx = reactContext ?: return
    val map = Arguments.createMap().apply { putInt("state", state) }
    ctx.sendJsEvent("playback-state", map)
  }

  fun emitError(code: String, message: String?) {
    val ctx = reactContext ?: return
    val map = Arguments.createMap().apply {
      putString("code", code)
      putString("message", message ?: "Unknown playback error")
    }
    ctx.sendJsEvent("playback-error", map)
  }

  fun emitSeek(positionSec: Double) {
    val ctx = reactContext ?: return
    val map = Arguments.createMap().apply { putDouble("position", positionSec) }
    ctx.sendJsEvent("remote-seek", map)
  }
}
