package cn.toside.music.mobile.utils;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Rect;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Log;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import androidx.core.app.LocaleManagerCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.ColorUtils;
import androidx.core.graphics.Insets;
import androidx.core.os.LocaleListCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.uimanager.UIManagerModule;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

import cn.toside.music.mobile.widget.XmusicWidgetUpdater;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class UtilsModule extends ReactContextBaseJavaModule {
  private final ReactApplicationContext reactContext;
  private BroadcastReceiver screenOnOffReceiver = null;
  private final ExecutorService paletteExecutor = Executors.newFixedThreadPool(2);
  private final Map<String, CachedPalette> paletteCache = Collections.synchronizedMap(
    new LinkedHashMap<String, CachedPalette>(48, 0.75f, true) {
      @Override
      protected boolean removeEldestEntry(Map.Entry<String, CachedPalette> eldest) {
        return size() > 40;
      }
    }
  );

  private static final class CachedPalette {
    final boolean isNeutral;
    final String seedRgb;
    final String[] colors;

    CachedPalette(boolean isNeutral, String seedRgb, String[] colors) {
      this.isNeutral = isNeutral;
      this.seedRgb = seedRgb;
      this.colors = colors;
    }

    WritableMap toWritableMap() {
      WritableMap map = Arguments.createMap();
      map.putBoolean("isNeutral", isNeutral);
      if (seedRgb == null) {
        map.putNull("seedRgb");
      } else {
        map.putString("seedRgb", seedRgb);
      }
      WritableArray arr = Arguments.createArray();
      if (colors != null) {
        for (String c : colors) {
          arr.pushString(c);
        }
      }
      map.putArray("colors", arr);
      return map;
    }
  }

  private int listenerCount = 0;

  UtilsEvent utilsEvent;

  UtilsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    utilsEvent = new UtilsEvent(reactContext);
    registerScreenBroadcastReceiver();
  }

  @Override
  public String getName() {
    return "UtilsModule";
  }

  @Override
  public void invalidate() {
    if (screenOnOffReceiver != null) {
      try {
        reactContext.unregisterReceiver(screenOnOffReceiver);
      } catch (Exception ignored) {}
      screenOnOffReceiver = null;
    }
    paletteExecutor.shutdownNow();
    super.invalidate();
  }

  @ReactMethod
  public void addListener(String eventName) {
    if (listenerCount == 0) {
      // Set up any upstream listeners or background tasks as necessary
    }

    listenerCount += 1;
  }

  @ReactMethod
  public void removeListeners(Integer count) {
    listenerCount -= count;
    if (listenerCount == 0) {
      // Remove upstream listeners, stop unnecessary background tasks
    }
  }

  private void registerScreenBroadcastReceiver() {
    final IntentFilter theFilter = new IntentFilter();
    /** System Defined Broadcast */
    theFilter.addAction(Intent.ACTION_SCREEN_ON);
    theFilter.addAction(Intent.ACTION_SCREEN_OFF);

    screenOnOffReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        String strAction = intent.getAction();
        if (strAction == null) return;

        WritableMap params = Arguments.createMap();

        switch (strAction) {
          case Intent.ACTION_SCREEN_OFF:

            params.putString("state", "OFF");
            utilsEvent.sendEvent(utilsEvent.SCREEN_STATE, params);
            break;
          case Intent.ACTION_SCREEN_ON:
            params.putString("state", "ON");
            utilsEvent.sendEvent(utilsEvent.SCREEN_STATE, params);
            break;
        }
      }
    };

    reactContext.registerReceiver(screenOnOffReceiver, theFilter);
  }

  @ReactMethod
  public void exitApp() {
    // https://github.com/wumke/react-native-exit-app/blob/master/android/src/main/java/com/github/wumke/RNExitApp/RNExitAppModule.java
    // android.os.Process.killProcess(android.os.Process.myPid());

    // https://stackoverflow.com/questions/6330200/how-to-quit-android-application-programmatically
    Activity currentActivity = reactContext.getCurrentActivity();
    Log.d("Utils", "Exit app...");
    if (currentActivity == null) {
      Log.d("Utils", "killProcess");
      android.os.Process.killProcess(android.os.Process.myPid());
    } else {
      currentActivity.finishAndRemoveTask();
      System.exit(0);
    }
  }

  @ReactMethod
  public void getSupportedAbis(Promise promise) {
    // https://github.com/react-native-device-info/react-native-device-info/blob/ff8f672cb08fa39a887567d6e23e2f08778e8340/android/src/main/java/com/learnium/RNDeviceInfo/RNDeviceModule.java#L877
    WritableArray array = new WritableNativeArray();
    for (String abi : Build.SUPPORTED_ABIS) {
      array.pushString(abi);
    }
    promise.resolve(array);
  }

  @ReactMethod
  public void installApk(String filePath, String fileProviderAuthority, Promise promise) {
    // https://github.com/mikehardy/react-native-update-apk/blob/master/android/src/main/java/net/mikehardy/rnupdateapk/RNUpdateAPK.java
    File file = new File(filePath);
    if (!file.exists()) {
      Log.e("Utils", "installApk: file doe snot exist '" + filePath + "'");
      // FIXME this should take a promise and fail it
      promise.reject("Utils", "installApk: file doe snot exist '" + filePath + "'");
      return;
    }

    if (Build.VERSION.SDK_INT >= 24) {
      // API24 and up has a package installer that can handle FileProvider content:// URIs
      Uri contentUri;
      try {
        contentUri = FileProvider.getUriForFile(getReactApplicationContext(), fileProviderAuthority, file);
      } catch (Exception e) {
        // FIXME should be a Promise.reject really
        Log.e("Utils", "installApk exception with authority name '" + fileProviderAuthority + "'", e);
        promise.reject("Utils", "installApk exception with authority name '" + fileProviderAuthority + "'");
        return;
        // throw e;
      }
      Intent installApp = new Intent(Intent.ACTION_INSTALL_PACKAGE);
      installApp.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      installApp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      installApp.setData(contentUri);
      installApp.putExtra(Intent.EXTRA_INSTALLER_PACKAGE_NAME, reactContext.getApplicationInfo().packageName);
      reactContext.startActivity(installApp);
      promise.resolve(null);
    } else {
      // Old APIs do not handle content:// URIs, so use an old file:// style
      String cmd = "chmod 777 " + file;
      try {
        Runtime.getRuntime().exec(cmd);
      } catch (Exception e) {
        // e.printStackTrace();
        Log.e("Utils", "installApk exception : " + e.getMessage(), e);
        promise.reject("Utils", e.getMessage());
      }
      Intent intent = new Intent(Intent.ACTION_VIEW);
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      intent.setDataAndType(Uri.parse("file://" + file), "application/vnd.android.package-archive");
      reactContext.startActivity(intent);
      promise.resolve(null);
    }
  }

  @ReactMethod
  public void screenkeepAwake() {
    // https://github.com/corbt/react-native-keep-awake/blob/master/android/src/main/java/com/corbt/keepawake/KCKeepAwake.java
    final Activity activity = getCurrentActivity();

    if (activity != null) {
      activity.runOnUiThread(() -> {
        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
      });
    }
  }

  @ReactMethod
  public void screenUnkeepAwake() {
    // https://github.com/corbt/react-native-keep-awake/blob/master/android/src/main/java/com/corbt/keepawake/KCKeepAwake.java
    final Activity activity = getCurrentActivity();

    if (activity != null) {
      activity.runOnUiThread(() -> {
        activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
      });
    }
  }

  /**
   Gets the device's WiFi interface IP address
   @return device's WiFi IP if connected to WiFi, else '0.0.0.0'
   */
  @ReactMethod
  public void getWIFIIPV4Address(final Promise promise) throws Exception {
    // https://github.com/pusherman/react-native-network-info/blob/master/android/src/main/java/com/pusherman/networkinfo/RNNetworkInfo.java
    WifiManager wifi = (WifiManager) reactContext.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
    new Thread(new Runnable() {
      public void run() {
        try {
          WifiInfo info = wifi.getConnectionInfo();
          int ipAddress = info.getIpAddress();
          @SuppressLint("DefaultLocale") String stringip = String.format("%d.%d.%d.%d", (ipAddress & 0xff), (ipAddress >> 8 & 0xff),
            (ipAddress >> 16 & 0xff), (ipAddress >> 24 & 0xff));
          promise.resolve(stringip);
        }catch (Exception e) {
          promise.resolve(null);
        }
      }
    }).start();
  }

  // https://stackoverflow.com/a/26117646
  @ReactMethod
  public void getDeviceName(final Promise promise) {
    String manufacturer = Build.MANUFACTURER;
    String model = Build.MODEL;
    if (model.startsWith(manufacturer)) {
      promise.resolve(capitalize(model));
    } else {
      promise.resolve(capitalize(manufacturer) + " " + model);
    }
  }
  private String capitalize(String s) {
    if (s == null || s.isEmpty()) {
      return "";
    }
    char first = s.charAt(0);
    if (Character.isUpperCase(first)) {
      return s;
    } else {
      return Character.toUpperCase(first) + s.substring(1);
    }
  }

  @ReactMethod
  public void isNotificationsEnabled(final Promise promise) {
    new Thread(() -> {
      boolean enabled = NotificationPermissionUtil.isNotificationsEnabled(
        reactContext.getApplicationContext());
      promise.resolve(enabled);
    }).start();
  }

  @ReactMethod
  public void openNotificationPermissionActivity(Promise promise) {
    new Thread(() -> {
      boolean result = NotificationPermissionUtil.openNotificationPermissionActivity(
        reactContext.getApplicationContext());
      promise.resolve(result);
    }).start();
  }

  @ReactMethod
  public void shareText(String shareTitle, String title, String text) {
    Intent shareIntent = new Intent(Intent.ACTION_SEND);
    shareIntent.setType("text/plain");
    shareIntent.putExtra(Intent.EXTRA_TEXT, text);
    shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
    Intent chooser = Intent.createChooser(shareIntent, shareTitle);
    Activity activity = reactContext.getCurrentActivity();
    if (activity != null) {
      activity.startActivity(chooser);
    } else {
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      reactContext.startActivity(chooser);
    }
  }

  @ReactMethod
  public void performHaptic(String type) {
    UiThreadUtil.runOnUiThread(() -> {
      Activity activity = reactContext.getCurrentActivity();
      View decor = (activity != null && activity.getWindow() != null)
        ? activity.getWindow().getDecorView()
        : null;

      if ("heart".equals(type) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        Vibrator vibrator = (Vibrator) reactContext.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
          vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK));
          return;
        }
      }

      if (decor != null) {
        int constant;
        switch (type == null ? "light" : type) {
          case "tick":
            constant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
              ? HapticFeedbackConstants.CLOCK_TICK
              : HapticFeedbackConstants.KEYBOARD_TAP;
            break;
          case "confirm":
          case "heart":
            constant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
              ? HapticFeedbackConstants.CONFIRM
              : HapticFeedbackConstants.VIRTUAL_KEY;
            break;
          case "heavy":
            constant = HapticFeedbackConstants.LONG_PRESS;
            break;
          case "light":
          default:
            constant = HapticFeedbackConstants.KEYBOARD_TAP;
            break;
        }
        decor.performHapticFeedback(constant);
      }
    });
  }

  // https://stackoverflow.com/questions/73463341/in-per-app-language-how-to-get-app-locale-in-api-33-if-system-locale-is-diffe
  @ReactMethod
  public void getSystemLocales(Promise promise) {
    Locale locale = null;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      LocaleListCompat list = LocaleManagerCompat.getSystemLocales(reactContext);
      if (!list.isEmpty()) {
        locale = list.get(0);
      } else {
        promise.resolve(null);
        return;
      }
    } else {
      locale = Locale.getDefault();
    }
    if (locale == null) {
      promise.resolve("");
      return;
    }

    // 格式化成 zh_cn、en_us 等
    String language = locale.getLanguage(); // zh, en
    String country = locale.getCountry();   // CN, US
    String localeStr;

    if (!country.isEmpty()) {
      localeStr = language.toLowerCase() + "_" + country.toLowerCase();
    } else {
      localeStr = language.toLowerCase();
    }

    promise.resolve(localeStr);
  }

  // https://github.com/Anthonyzou/react-native-full-screen/blob/master/android/src/main/java/com/rn/full/screen/FullScreen.java
  //  @ReactMethod
  //  public void onFullScreen() {
  //    UiThreadUtil.runOnUiThread(() -> {
  //      Activity currentActivity = reactContext.getCurrentActivity();
  //      if (currentActivity == null) return;
  //      currentActivity.getWindow().getDecorView().setSystemUiVisibility(
  //        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
  //          | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
  //          | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
  //          | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION // hide nav bar
  //          | View.SYSTEM_UI_FLAG_FULLSCREEN // hide status bar
  //          | View.SYSTEM_UI_FLAG_IMMERSIVE
  //      );
  //    });
  //  }
  //  @ReactMethod
  //  public void offFullScreen() {
  //    UiThreadUtil.runOnUiThread(() -> {
  //      Activity currentActivity = reactContext.getCurrentActivity();
  //      if (currentActivity == null) return;
  //      currentActivity.getWindow().getDecorView().setSystemUiVisibility(
  //        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
  //          | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
  //          | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
  //      );
  //    });
  //  }

  @ReactMethod
  public void getWindowSize(Promise promise) {
    UiThreadUtil.runOnUiThread(() -> {
      WritableMap params = Arguments.createMap();
      Activity currentActivity = reactContext.getCurrentActivity();
      if (currentActivity == null || currentActivity.getWindow() == null) {
        params.putInt("width", 0);
        params.putInt("height", 0);
        promise.resolve(params);
        return;
      }
      Window window = currentActivity.getWindow();
      Rect rect = new Rect();
      window.getDecorView().getWindowVisibleDisplayFrame(rect);
      params.putInt("width", rect.width());
      params.putInt("height", rect.height());
      promise.resolve(params);
    });
  }

  @ReactMethod
  public void getNavigationBarHeight(Promise promise) {
    UiThreadUtil.runOnUiThread(() -> {
      Activity currentActivity = reactContext.getCurrentActivity();
      if (currentActivity == null || currentActivity.getWindow() == null) {
        promise.resolve(0);
        return;
      }
      Window window = currentActivity.getWindow();
      WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(window.getDecorView());
      if (insets != null) {
        Insets navInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
        promise.resolve(navInsets.bottom);
        return;
      }
      Rect rect = new Rect();
      window.getDecorView().getWindowVisibleDisplayFrame(rect);
      int decorHeight = window.getDecorView().getHeight();
      int navBarHeight = decorHeight > 0 ? Math.max(0, decorHeight - rect.bottom) : 0;
      promise.resolve(navBarHeight);
    });
  }

  @ReactMethod
  public void isIgnoringBatteryOptimization(Promise promise) {
    new Thread(() -> {
      boolean result = BatteryOptimizationUtil.isIgnoringBatteryOptimization(
        reactContext.getApplicationContext(),
        reactContext.getPackageName()
      );
      promise.resolve(result);
    }).start();
  }

  @ReactMethod
  public void requestIgnoreBatteryOptimization(Promise promise) {
    new Thread(() -> {
      try {
        boolean result = BatteryOptimizationUtil.requestIgnoreBatteryOptimization(
          reactContext.getApplicationContext(),
          reactContext.getPackageName()
        );
        promise.resolve(result);
      } catch (Exception e) {
        promise.reject("ERROR", e);
      }
    }).start();
  }

  @ReactMethod
  public void extractCoverPalette(final String uri, final Promise promise) {
    if (uri == null || uri.trim().isEmpty()) {
      promise.resolve(new CachedPalette(true, null, new String[0]).toWritableMap());
      return;
    }
    final String key = uri.trim();
    CachedPalette hit = paletteCache.get(key);
    if (hit != null) {
      promise.resolve(hit.toWritableMap());
      return;
    }
    if (paletteExecutor.isShutdown()) {
      promise.resolve(new CachedPalette(true, null, new String[0]).toWritableMap());
      return;
    }
    paletteExecutor.execute(() -> {
      Bitmap bmp = null;
      try {
        bmp = decodeTinyCoverBitmap(key, 32);
        if (bmp == null || bmp.getWidth() <= 0 || bmp.getHeight() <= 0) {
          promise.resolve(new CachedPalette(true, null, new String[0]).toWritableMap());
          return;
        }
        CachedPalette computed = analyzeCoverBitmap(bmp);
        paletteCache.put(key, computed);
        promise.resolve(computed.toWritableMap());
      } catch (Exception e) {
        promise.resolve(new CachedPalette(true, null, new String[0]).toWritableMap());
      } finally {
        if (bmp != null && !bmp.isRecycled()) {
          bmp.recycle();
        }
      }
    });
  }

  private Bitmap decodeTinyCoverBitmap(String uri, int targetMaxSide) throws Exception {
    byte[] rawBytes = null;
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      HttpURLConnection conn = null;
      InputStream is = null;
      try {
        conn = (HttpURLConnection) new URL(uri).openConnection();
        conn.setConnectTimeout(4500);
        conn.setReadTimeout(4500);
        conn.setInstanceFollowRedirects(true);
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36");
        int code = conn.getResponseCode();
        if (code < 200 || code >= 300) return null;
        is = conn.getInputStream();
        rawBytes = readStreamCapped(is, 4 * 1024 * 1024);
      } finally {
        if (is != null) try { is.close(); } catch (Exception ignored) {}
        if (conn != null) conn.disconnect();
      }
    } else if (uri.startsWith("content://")) {
      try (InputStream is = reactContext.getContentResolver().openInputStream(Uri.parse(uri))) {
        if (is == null) return null;
        rawBytes = readStreamCapped(is, 4 * 1024 * 1024);
      }
    } else {
      String filePath = uri.startsWith("file://") ? Uri.parse(uri).getPath() : uri;
      if (filePath == null) return null;
      File file = new File(filePath);
      if (!file.exists()) return null;
      BitmapFactory.Options bounds = new BitmapFactory.Options();
      bounds.inJustDecodeBounds = true;
      BitmapFactory.decodeFile(filePath, bounds);
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null;
      BitmapFactory.Options decodeOpts = new BitmapFactory.Options();
      decodeOpts.inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, targetMaxSide);
      decodeOpts.inPreferredConfig = Bitmap.Config.ARGB_8888;
      return BitmapFactory.decodeFile(filePath, decodeOpts);
    }

    if (rawBytes == null || rawBytes.length == 0) return null;
    BitmapFactory.Options bounds = new BitmapFactory.Options();
    bounds.inJustDecodeBounds = true;
    BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.length, bounds);
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null;
    BitmapFactory.Options decodeOpts = new BitmapFactory.Options();
    decodeOpts.inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, targetMaxSide);
    decodeOpts.inPreferredConfig = Bitmap.Config.ARGB_8888;
    return BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.length, decodeOpts);
  }

  private static byte[] readStreamCapped(InputStream is, int maxBytes) throws Exception {
    ByteArrayOutputStream bos = new ByteArrayOutputStream(16384);
    byte[] buf = new byte[8192];
    int total = 0;
    int read;
    while ((read = is.read(buf)) != -1) {
      total += read;
      if (total > maxBytes) break;
      bos.write(buf, 0, read);
    }
    return bos.toByteArray();
  }

  private static int computeInSampleSize(int width, int height, int targetMaxSide) {
    int inSampleSize = 1;
    int maxDim = Math.max(width, height);
    while ((maxDim / (inSampleSize * 2)) >= targetMaxSide) {
      inSampleSize *= 2;
    }
    return inSampleSize;
  }

  private static CachedPalette analyzeCoverBitmap(Bitmap bmp) {
    final int w = bmp.getWidth();
    final int h = bmp.getHeight();
    final int stepX = Math.max(1, w / 32);
    final int stepY = Math.max(1, h / 32);

    final int BUCKETS = 24;
    float[] bucketWeight = new float[BUCKETS];
    float[] bucketSinH = new float[BUCKETS];
    float[] bucketCosH = new float[BUCKETS];
    float[] bucketS = new float[BUCKETS];
    float[] bucketL = new float[BUCKETS];
    float totalChromaticWeight = 0f;
    int sampledPixels = 0;
    float[] hsl = new float[3];

    for (int y = 0; y < h; y += stepY) {
      for (int x = 0; x < w; x += stepX) {
        int pixel = bmp.getPixel(x, y);
        if (Color.alpha(pixel) < 128) continue;
        sampledPixels++;
        int r = Color.red(pixel);
        int g = Color.green(pixel);
        int b = Color.blue(pixel);
        ColorUtils.RGBToHSL(r, g, b, hsl);
        float hue = hsl[0];
        float sat = hsl[1];
        float lum = hsl[2];
        if (sat < 0.12f || lum < 0.08f || lum > 0.92f) continue;

        float lumPenalty = Math.max(0.15f, 1.0f - Math.abs(lum - 0.52f) * 1.35f);
        float weight = (0.30f + sat * 0.70f) * lumPenalty;
        int idx = Math.min(BUCKETS - 1, Math.max(0, (int) (hue / 15.0f)));
        double rad = Math.toRadians(hue);
        bucketWeight[idx] += weight;
        bucketSinH[idx] += (float) Math.sin(rad) * weight;
        bucketCosH[idx] += (float) Math.cos(rad) * weight;
        bucketS[idx] += sat * weight;
        bucketL[idx] += lum * weight;
        totalChromaticWeight += weight;
      }
    }

    if (sampledPixels == 0 || totalChromaticWeight < Math.max(1.8f, sampledPixels * 0.035f)) {
      return new CachedPalette(true, null, new String[0]);
    }

    int primaryIdx = 0;
    float bestWeight = -1f;
    for (int i = 0; i < BUCKETS; i++) {
      // Smooth with immediate circular neighbors so split hues across bucket boundaries unify cleanly
      int prev = (i + BUCKETS - 1) % BUCKETS;
      int next = (i + 1) % BUCKETS;
      float smoothed = bucketWeight[i] + 0.35f * (bucketWeight[prev] + bucketWeight[next]);
      if (smoothed > bestWeight && bucketWeight[i] > 0f) {
        bestWeight = smoothed;
        primaryIdx = i;
      }
    }

    float w1 = bucketWeight[primaryIdx];
    float h1 = (float) Math.toDegrees(Math.atan2(bucketSinH[primaryIdx], bucketCosH[primaryIdx]));
    if (h1 < 0f) h1 += 360f;
    float s1 = clampF(bucketS[primaryIdx] / w1, 0.42f, 0.82f);
    float l1 = clampF(bucketL[primaryIdx] / w1, 0.44f, 0.58f);

    // Find distinct secondary hue (>= 2 buckets / 30 deg away) if present
    int secondaryIdx = -1;
    float secondBest = 0f;
    for (int i = 0; i < BUCKETS; i++) {
      int dist = Math.abs(i - primaryIdx);
      dist = Math.min(dist, BUCKETS - dist);
      if (dist >= 2 && bucketWeight[i] > secondBest) {
        secondBest = bucketWeight[i];
        secondaryIdx = i;
      }
    }

    float h2;
    float s2;
    float l2;
    if (secondaryIdx >= 0 && secondBest >= w1 * 0.16f) {
      float w2 = bucketWeight[secondaryIdx];
      h2 = (float) Math.toDegrees(Math.atan2(bucketSinH[secondaryIdx], bucketCosH[secondaryIdx]));
      if (h2 < 0f) h2 += 360f;
      s2 = clampF(bucketS[secondaryIdx] / w2, 0.38f, 0.78f);
      l2 = clampF(bucketL[secondaryIdx] / w2, 0.40f, 0.56f);
    } else {
      h2 = (h1 + 36f) % 360f;
      s2 = clampF(s1 * 0.90f, 0.36f, 0.74f);
      l2 = clampF(l1 * 0.94f, 0.38f, 0.54f);
    }

    float h3 = (h1 + 324f) % 360f;
    float s3 = clampF(s1 * 0.86f, 0.34f, 0.72f);
    float l3 = clampF(l1 * 1.06f, 0.42f, 0.62f);

    float h4 = (h2 + 24f) % 360f;
    float s4 = clampF(s2 * 0.78f, 0.30f, 0.66f);
    float l4 = clampF(l2 * 0.84f, 0.32f, 0.48f);

    int seedColor = ColorUtils.HSLToColor(new float[]{h1, s1, l1});
    @SuppressLint("DefaultLocale")
    String seedRgb = String.format("rgb(%d, %d, %d)", Color.red(seedColor), Color.green(seedColor), Color.blue(seedColor));

    String[] colors = new String[]{
      toHexColor(ColorUtils.HSLToColor(new float[]{h1, s1, l1})),
      toHexColor(ColorUtils.HSLToColor(new float[]{h2, s2, l2})),
      toHexColor(ColorUtils.HSLToColor(new float[]{h3, s3, l3})),
      toHexColor(ColorUtils.HSLToColor(new float[]{h4, s4, l4}))
    };

    return new CachedPalette(false, seedRgb, colors);
  }

  private static float clampF(float v, float min, float max) {
    return Math.max(min, Math.min(max, v));
  }

  @SuppressLint("DefaultLocale")
  private static String toHexColor(int color) {
    return String.format("#%02X%02X%02X", Color.red(color), Color.green(color), Color.blue(color));
  }

  private volatile String lastSyncedWidgetCoverUri = "";

  @ReactMethod
  public void updateWidgetState(final ReadableMap map) {
    if (map == null) return;
    final String title = map.hasKey("title") && !map.isNull("title") ? map.getString("title") : null;
    final String artist = map.hasKey("artist") && !map.isNull("artist") ? map.getString("artist") : null;
    final String lyric = map.hasKey("lyric") && !map.isNull("lyric") ? map.getString("lyric") : null;
    final Boolean isPlaying = map.hasKey("isPlaying") && !map.isNull("isPlaying") ? map.getBoolean("isPlaying") : null;
    final Boolean isFavorite = map.hasKey("isFavorite") && !map.isNull("isFavorite") ? map.getBoolean("isFavorite") : null;
    final Integer accentColor = map.hasKey("accentColor") && !map.isNull("accentColor") ? (int) (long) map.getDouble("accentColor") : null;
    final String coverUri = map.hasKey("coverUri") && !map.isNull("coverUri") ? map.getString("coverUri") : null;

    XmusicWidgetUpdater.savePartialState(
      reactContext,
      title,
      artist,
      lyric,
      isPlaying,
      isFavorite,
      accentColor
    );

    if (coverUri != null && !coverUri.trim().isEmpty() && !coverUri.equals(lastSyncedWidgetCoverUri) && !paletteExecutor.isShutdown()) {
      lastSyncedWidgetCoverUri = coverUri;
      paletteExecutor.execute(() -> {
        Bitmap bmp = null;
        try {
          bmp = decodeTinyCoverBitmap(coverUri.trim(), 192);
          if (bmp != null && bmp.getWidth() > 0 && bmp.getHeight() > 0) {
            File out = new File(reactContext.getCacheDir(), "widget_cover.png");
            try (FileOutputStream fos = new FileOutputStream(out)) {
              bmp.compress(Bitmap.CompressFormat.PNG, 92, fos);
            }
            XmusicWidgetUpdater.updateAllWidgets(reactContext);
          }
        } catch (Exception ignored) {
        } finally {
          if (bmp != null && !bmp.isRecycled()) bmp.recycle();
        }
      });
    } else if (coverUri != null && coverUri.trim().isEmpty() && !lastSyncedWidgetCoverUri.isEmpty()) {
      lastSyncedWidgetCoverUri = "";
      try {
        File out = new File(reactContext.getCacheDir(), "widget_cover.png");
        if (out.exists()) out.delete();
        XmusicWidgetUpdater.updateAllWidgets(reactContext);
      } catch (Exception ignored) {}
    }
  }

  @ReactMethod
  public void captureViewToPng(final int viewTag, final Promise promise) {
    UIManagerModule uiManager = reactContext.getNativeModule(UIManagerModule.class);
    if (uiManager == null) {
      promise.reject("ERR_NO_UIMANAGER", "UIManagerModule unavailable");
      return;
    }
    uiManager.addUIBlock(nativeViewHierarchyManager -> {
      try {
        View view = nativeViewHierarchyManager.resolveView(viewTag);
        if (view == null || view.getWidth() <= 0 || view.getHeight() <= 0) {
          promise.reject("ERR_VIEW_EMPTY", "Target poster view is not laid out yet");
          return;
        }
        final Bitmap bitmap = Bitmap.createBitmap(view.getWidth(), view.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        view.draw(canvas);

        if (paletteExecutor.isShutdown()) {
          bitmap.recycle();
          promise.reject("ERR_SHUTDOWN", "Executor shut down");
          return;
        }
        paletteExecutor.execute(() -> {
          try {
            File dir = new File(reactContext.getCacheDir(), "share_posters");
            if (!dir.exists()) dir.mkdirs();
            // Clean up old cached posters (> 6 files) so cache stays tiny
            File[] existing = dir.listFiles();
            if (existing != null && existing.length > 6) {
              for (int i = 0; i < existing.length - 4; i++) {
                try { existing[i].delete(); } catch (Exception ignored) {}
              }
            }
            File outFile = new File(dir, "xmusic_lyric_poster_" + System.currentTimeMillis() + ".png");
            try (FileOutputStream fos = new FileOutputStream(outFile)) {
              bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
            }
            promise.resolve(outFile.getAbsolutePath());
          } catch (Exception e) {
            promise.reject("ERR_SAVE_PNG", e);
          } finally {
            if (!bitmap.isRecycled()) bitmap.recycle();
          }
        });
      } catch (Exception e) {
        promise.reject("ERR_CAPTURE", e);
      }
    });
  }

  @ReactMethod
  public void shareImage(final String filePath, final String shareTitle, final Promise promise) {
    if (filePath == null || filePath.trim().isEmpty()) {
      promise.reject("ERR_PATH", "Empty file path");
      return;
    }
    File file = new File(filePath);
    if (!file.exists()) {
      promise.reject("ERR_NOT_FOUND", "Poster image file does not exist");
      return;
    }
    try {
      String authority = reactContext.getPackageName() + ".provider";
      Uri contentUri = FileProvider.getUriForFile(reactContext, authority, file);
      Intent shareIntent = new Intent(Intent.ACTION_SEND);
      shareIntent.setType("image/png");
      shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
      shareIntent.setClipData(ClipData.newRawUri("Xmusic", contentUri));
      shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      Intent chooser = Intent.createChooser(shareIntent, shareTitle != null ? shareTitle : "Xmusic");
      Activity activity = reactContext.getCurrentActivity();
      if (activity != null) {
        activity.startActivity(chooser);
      } else {
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(chooser);
      }
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("ERR_SHARE_IMG", e);
    }
  }

  @ReactMethod
  public void saveImageToGallery(final String filePath, final String displayName, final Promise promise) {
    if (filePath == null || filePath.trim().isEmpty() || paletteExecutor.isShutdown()) {
      promise.reject("ERR_PATH", "Invalid image path");
      return;
    }
    paletteExecutor.execute(() -> {
      File src = new File(filePath);
      if (!src.exists()) {
        promise.reject("ERR_NOT_FOUND", "Source file not found");
        return;
      }
      String safeName = (displayName != null && !displayName.trim().isEmpty()
        ? displayName.replaceAll("[^a-zA-Z0-9_\\-\\u4e00-\\u9fa5]", "_")
        : "xmusic_poster") + "_" + System.currentTimeMillis() + ".png";
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          ContentResolver resolver = reactContext.getContentResolver();
          ContentValues values = new ContentValues();
          values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
          values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
          values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Xmusic");
          values.put(MediaStore.Images.Media.IS_PENDING, 1);
          Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
          if (uri == null) {
            promise.reject("ERR_MEDIASTORE", "Failed to create MediaStore entry");
            return;
          }
          try (InputStream in = new FileInputStream(src); OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) throw new IllegalStateException("Null OutputStream");
            byte[] buf = new byte[8192];
            int len;
            while ((len = in.read(buf)) != -1) {
              out.write(buf, 0, len);
            }
          }
          values.clear();
          values.put(MediaStore.Images.Media.IS_PENDING, 0);
          resolver.update(uri, values, null, null);
          promise.resolve(uri.toString());
        } else {
          File pubDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Xmusic");
          if (!pubDir.exists()) pubDir.mkdirs();
          File dest = new File(pubDir, safeName);
          try (InputStream in = new FileInputStream(src); OutputStream out = new FileOutputStream(dest)) {
            byte[] buf = new byte[8192];
            int len;
            while ((len = in.read(buf)) != -1) {
              out.write(buf, 0, len);
            }
          }
          MediaScannerConnection.scanFile(reactContext, new String[]{dest.getAbsolutePath()}, new String[]{"image/png"}, null);
          promise.resolve(dest.getAbsolutePath());
        }
      } catch (Exception e) {
        promise.reject("ERR_GALLERY", e);
      }
    });
  }
}

