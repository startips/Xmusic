package cn.toside.music.mobile

import cn.toside.music.mobile.cache.CachePackage
import cn.toside.music.mobile.crypto.CryptoPackage
import cn.toside.music.mobile.lyric.LyricPackage
import cn.toside.music.mobile.player.XmusicPlayerPackage
import cn.toside.music.mobile.storage.XmusicStoragePackage
import cn.toside.music.mobile.userApi.UserApiPackage
import cn.toside.music.mobile.utils.UtilsPackage
import cn.toside.music.mobile.view.XmusicViewPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.reactnativenavigation.NavigationApplication
import com.reactnativenavigation.react.NavigationReactNativeHost

class MainApplication : NavigationApplication() {
  override val reactNativeHost: ReactNativeHost = object : NavigationReactNativeHost(this) {
    override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

    override fun getPackages(): List<ReactPackage> {
      val packages: MutableList<ReactPackage> = PackageList(this).packages.toMutableList()
      packages.add(CachePackage())
      packages.add(LyricPackage())
      packages.add(UtilsPackage())
      packages.add(CryptoPackage())
      packages.add(UserApiPackage())
      packages.add(XmusicViewPackage())
      packages.add(XmusicPlayerPackage())
      packages.add(XmusicStoragePackage())
      return packages
    }

    override fun getJSMainModuleName(): String = "index"

    override val isNewArchEnabled: Boolean
      get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

    override val isHermesEnabled: Boolean
      get() = BuildConfig.IS_HERMES_ENABLED
  }

  override fun onCreate() {
    super.onCreate()
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load()
    }
  }
}
