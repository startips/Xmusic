package cn.toside.music.mobile.userApi

import android.util.Log
import com.whl.quickjs.wrapper.QuickJSContext

class QuickJsConsole(
  private val onLog: (type: String, log: String) -> Unit,
) : QuickJSContext.Console {

  private fun emit(type: String, info: String?) {
    val msg = info ?: ""
    Log.d("UserApi Log", "[$type]$msg")
    onLog(type, msg)
  }

  override fun log(info: String?) = emit("log", info)

  override fun info(info: String?) = emit("info", info)

  override fun warn(info: String?) = emit("warn", info)

  override fun error(info: String?) = emit("error", info)
}
