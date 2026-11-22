package cn.toside.music.mobile.audio;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.guichaguri.trackplayer.service.player.XmusicDspConfig;

public class AudioEffectModule extends ReactContextBaseJavaModule {
    private static final int BAND_COUNT = XmusicDspConfig.CENTER_FREQS_HZ.length;

    private int currentSessionId = 0;
    private boolean enabled = false;
    private int[] desiredBandsMb = new int[]{0, 0, 0, 0, 0};
    private int desiredBassStrength = 0;
    private int desiredLoudnessGainMb = 0;

    public AudioEffectModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "AudioEffectModule";
    }

    @ReactMethod
    public void bindAudioSession(int sessionId, Promise promise) {
        currentSessionId = Math.max(0, sessionId);
        promise.resolve(currentSessionId);
    }

    @ReactMethod
    public void setEffectConfig(boolean isEnabled, ReadableArray bandLevels, int bassStrength, int loudnessGainMb, Promise promise) {
        int[] nextBands = new int[BAND_COUNT];
        for (int i = 0; i < BAND_COUNT; i++) {
            int val = (bandLevels != null && i < bandLevels.size()) ? bandLevels.getInt(i) : 0;
            nextBands[i] = Math.max(-1500, Math.min(1500, val));
        }
        int clampedBass = Math.max(0, Math.min(1000, bassStrength));
        int clampedLoud = Math.max(0, Math.min(1200, loudnessGainMb));

        synchronized (this) {
            this.enabled = isEnabled;
            this.desiredBandsMb = nextBands;
            this.desiredBassStrength = clampedBass;
            this.desiredLoudnessGainMb = clampedLoud;
        }

        XmusicDspConfig.updateConfig(isEnabled, nextBands, clampedBass, clampedLoud);
        promise.resolve(true);
    }

    @ReactMethod
    public void getEffectInfo(Promise promise) {
        int[] snapshotBands;
        int sessionId;
        synchronized (this) {
            snapshotBands = desiredBandsMb.clone();
            sessionId = currentSessionId;
        }

        WritableMap result = Arguments.createMap();
        result.putInt("audioSessionId", sessionId);
        result.putBoolean("supported", true);
        result.putInt("minLevel", -1500);
        result.putInt("maxLevel", 1500);

        WritableArray bandsArr = Arguments.createArray();
        for (int i = 0; i < BAND_COUNT; i++) {
            WritableMap bandMap = Arguments.createMap();
            bandMap.putInt("index", i);
            bandMap.putInt("centerFreqHz", XmusicDspConfig.CENTER_FREQS_HZ[i]);
            bandMap.putInt("level", i < snapshotBands.length ? snapshotBands[i] : 0);
            bandsArr.pushMap(bandMap);
        }
        result.putArray("bands", bandsArr);
        promise.resolve(result);
    }
}
