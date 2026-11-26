package cn.toside.music.mobile.core

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Lifecycle-bound coroutine scope for React Native native modules.
 * Cancelled automatically when the module is invalidated.
 */
class ModuleCoroutineScope {
  private val job = SupervisorJob()
  val scope: CoroutineScope = CoroutineScope(job + Dispatchers.Main.immediate)

  fun launchIO(block: suspend CoroutineScope.() -> Unit): Job =
    scope.launch(Dispatchers.IO, block = block)

  fun launchMain(block: suspend CoroutineScope.() -> Unit): Job =
    scope.launch(Dispatchers.Main.immediate, block = block)

  fun cancel() {
    scope.cancel()
  }
}
