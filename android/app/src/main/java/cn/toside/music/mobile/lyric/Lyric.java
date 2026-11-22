package cn.toside.music.mobile.lyric;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;

public class Lyric extends LyricPlayer {
  LyricView lyricView = null;
  LyricEvent lyricEvent = null;
  ReactApplicationContext reactAppContext;
  private BroadcastReceiver screenOnOffReceiver = null;

  boolean isRunPlayer = false;
  int lastLine = 0;
  List lines = new ArrayList();
  boolean isShowTranslation;
  boolean isShowRoma;
  boolean isShowLyricView = false;
  boolean isSendLyricTextEvent = false;
  boolean isScreenOff = false;
  String lyricText = "";
  String translationText = "";
  String romaLyricText = "";

  Lyric(ReactApplicationContext reactContext, boolean isShowTranslation, boolean isShowRoma, float playbackRate) {
    this.reactAppContext = reactContext;
    this.isShowTranslation = isShowTranslation;
    this.isShowRoma = isShowRoma;
    this.playbackRate = playbackRate;
    registerScreenBroadcastReceiver();
  }

  private void registerScreenBroadcastReceiver() {
    final IntentFilter theFilter = new IntentFilter();
    theFilter.addAction(Intent.ACTION_SCREEN_ON);
    theFilter.addAction(Intent.ACTION_SCREEN_OFF);

    screenOnOffReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        String strAction = intent.getAction();
        if (strAction == null) return;
        switch (strAction) {
          case Intent.ACTION_SCREEN_OFF:
            handleScreenOff();
            break;
          case Intent.ACTION_SCREEN_ON:
            handleScreenOn();
            break;
        }
      }
    };

    reactAppContext.registerReceiver(screenOnOffReceiver, theFilter);
  }

  public void destroy() {
    pause();
    if (screenOnOffReceiver != null) {
      try {
        reactAppContext.unregisterReceiver(screenOnOffReceiver);
      } catch (Exception ignored) {}
      screenOnOffReceiver = null;
    }
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) {
        lyricView.destroy();
        lyricView = null;
      }
    });
  }

  private boolean isDisableAutoPause() {
    return !isRunPlayer || isSendLyricTextEvent;
  }

  private void handleScreenOff() {
    isScreenOff = true;
    if (isDisableAutoPause()) return;
    setTempPause(true);
  }

  private void handleScreenOn() {
    isScreenOff = false;
    if (isDisableAutoPause()) return;
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricEvent == null) lyricEvent = new LyricEvent(reactAppContext);
      if (lyricView == null) lyricView = new LyricView(reactAppContext, lyricEvent);
      handleGetCurrentLyric(lastLine);
      setTempPause(false);
    });
  }

  private void pausePlayer() {
    if (!isRunPlayer || isShowLyricView || isSendLyricTextEvent) return;
    isRunPlayer = false;
    this.pause();
  }

  private void setCurrentLyric(String lyric, ArrayList<String> extendedLyrics) {
    if (isShowLyricView && !isScreenOff && lyricView != null) {
      UiThreadUtil.runOnUiThread(() -> {
        if (lyricView != null) lyricView.setLyric(lyric, extendedLyrics);
      });
    }
    if (isSendLyricTextEvent && lyricEvent != null) {
      WritableMap params = Arguments.createMap();
      params.putString("text", lyric);
      params.putArray("extendedLyrics", Arguments.makeNativeArray(extendedLyrics));
      lyricEvent.sendEvent(lyricEvent.LYRIC_Line_PLAY, params);
    }
  }

  private void handleGetCurrentLyric(int lineNum) {
    lastLine = lineNum;
    if (lineNum >= 0 && lineNum < lines.size()) {
      HashMap line = (HashMap) lines.get(lineNum);
      if (line != null) {
        setCurrentLyric((String) line.get("text"), (ArrayList<String>) line.get("extendedLyrics"));
        return;
      }
    }
    setCurrentLyric("", new ArrayList<>(0));
  }

  public void setSendLyricTextEvent(boolean isSend) {
    if (isSendLyricTextEvent == isSend) return;
    isSendLyricTextEvent = isSend;
    if (isSend) {
      if (lyricEvent == null) lyricEvent = new LyricEvent(reactAppContext);
      isRunPlayer = true;
    } else {
      pausePlayer();
    }
  }

  public void showDesktopLyric(Bundle options, Promise promise) {
    UiThreadUtil.runOnUiThread(() -> {
      if (isShowLyricView) {
        promise.resolve(null);
        return;
      }
      if (lyricEvent == null) lyricEvent = new LyricEvent(reactAppContext);
      if (lyricView == null) lyricView = new LyricView(reactAppContext, lyricEvent);
      try {
        lyricView.showLyricView(options);
        isShowLyricView = true;
        isRunPlayer = true;
        promise.resolve(null);
      } catch (Exception e) {
        isShowLyricView = false;
        promise.reject(e);
        Log.e("Lyric", String.valueOf(e.getMessage()));
      }
    });
  }

  public void hideDesktopLyric() {
    if (!isShowLyricView) return;
    isShowLyricView = false;
    pausePlayer();
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) {
        lyricView.destroy();
        lyricView = null;
      }
    });
  }

  private void refreshLyric() {
    if (!isRunPlayer) return;
    ArrayList<String> extendedLyrics = new ArrayList<>(2);
    if (isShowTranslation && !"".equals(translationText)) extendedLyrics.add(translationText);
    if (isShowRoma && !"".equals(romaLyricText)) extendedLyrics.add(romaLyricText);
    super.setLyric(lyricText, extendedLyrics);
  }

  public void setLyric(String lyric, String translation, String romaLyric) {
    lyricText = lyric;
    translationText = translation;
    romaLyricText = romaLyric;
    refreshLyric();
  }

  @Override
  public void onSetLyric(List lines) {
    this.lines = lines;
    handleGetCurrentLyric(-1);
  }

  @Override
  public void onPlay(int lineNum) {
    handleGetCurrentLyric(lineNum);
  }

  public void pauseLyric() {
    pause();
    if (!isRunPlayer) return;
    handleGetCurrentLyric(-1);
  }

  public void lockLyric() {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.lockView();
    });
  }

  public void unlockLyric() {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.unlockView();
    });
  }

  public void setMaxLineNum(int maxLineNum) {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.setMaxLineNum(maxLineNum);
    });
  }

  public void setWidth(int width) {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.setWidth(width);
    });
  }

  public void setSingleLine(boolean singleLine) {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.setSingleLine(singleLine);
    });
  }

  public void setShowToggleAnima(boolean showToggleAnima) {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.setShowToggleAnima(showToggleAnima);
    });
  }

  public void toggleTranslation(boolean isShowTranslation) {
    this.isShowTranslation = isShowTranslation;
    refreshLyric();
  }

  public void toggleRoma(boolean isShowRoma) {
    this.isShowRoma = isShowRoma;
    refreshLyric();
  }

  public void setPlayedColor(String unplayColor, String playedColor, String shadowColor) {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.setColor(unplayColor, playedColor, shadowColor);
    });
  }

  public void setAlpha(float alpha) {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.setAlpha(alpha);
    });
  }

  public void setTextSize(float size) {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.setTextSize(size);
    });
  }

  public void setLyricTextPosition(String positionX, String positionY) {
    UiThreadUtil.runOnUiThread(() -> {
      if (lyricView != null) lyricView.setLyricTextPosition(positionX, positionY);
    });
  }
}
