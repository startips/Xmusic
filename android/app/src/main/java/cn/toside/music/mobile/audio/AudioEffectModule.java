package cn.toside.music.mobile.audio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.audiofx.BassBoost;
import android.media.audiofx.Equalizer;
import android.media.audiofx.LoudnessEnhancer;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class AudioEffectModule extends ReactContextBaseJavaModule {
    private static final String TAG = "XmusicAudioEffect";
    private static final String ACTION_AUDIO_SESSION = "com.startips.xmusic.AUDIO_SESSION_CHANGED";
    private static final int[] FALLBACK_FREQS_HZ = new int[]{60, 230, 910, 3600, 14000};

    private final ReactApplicationContext reactContext;
    private final Object lock = new Object();

    private int currentSessionId = 0;
    private boolean enabled = false;
    private int[] desiredBandsMb = new int[]{0, 0, 0, 0, 0};
    private int desiredBassStrength = 0;
    private int desiredLoudnessGainMb = 0;

    private Equalizer equalizer = null;
    private BassBoost bassBoost = null;
    private LoudnessEnhancer loudnessEnhancer = null;
    private boolean receiverRegistered = false;

    private final BroadcastReceiver sessionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null) return;
            int sessionId = intent.getIntExtra("audioSessionId", 0);
            attachToSession(sessionId);
        }
    };

    public AudioEffectModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "AudioEffectModule";
    }

    @Override
    public void initialize() {
        super.initialize();
        if (!receiverRegistered) {
            try {
                IntentFilter filter = new IntentFilter(ACTION_AUDIO_SESSION);
                ContextCompat.registerReceiver(reactContext, sessionReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
                receiverRegistered = true;
            } catch (Exception e) {
                Log.w(TAG, "Failed to register audio session receiver: " + e.getMessage());
            }
        }
    }

    @Override
    public void invalidate() {
        if (receiverRegistered) {
            try {
                reactContext.unregisterReceiver(sessionReceiver);
            } catch (Exception ignored) {}
            receiverRegistered = false;
        }
        synchronized (lock) {
            releaseEffectsLocked();
            currentSessionId = 0;
        }
        super.invalidate();
    }

    private void releaseEffectsLocked() {
        if (equalizer != null) {
            try { equalizer.release(); } catch (Exception ignored) {}
            equalizer = null;
        }
        if (bassBoost != null) {
            try { bassBoost.release(); } catch (Exception ignored) {}
            bassBoost = null;
        }
        if (loudnessEnhancer != null) {
            try { loudnessEnhancer.release(); } catch (Exception ignored) {}
            loudnessEnhancer = null;
        }
    }

    private void attachToSession(int sessionId) {
        synchronized (lock) {
            if (sessionId == currentSessionId && (sessionId <= 0 || equalizer != null)) {
                applyEffectsLocked();
                return;
            }
            releaseEffectsLocked();
            currentSessionId = Math.max(0, sessionId);
            if (currentSessionId <= 0) return;

            try {
                equalizer = new Equalizer(0, currentSessionId);
            } catch (Exception e) {
                Log.w(TAG, "Equalizer init failed: " + e.getMessage());
                equalizer = null;
            }

            try {
                bassBoost = new BassBoost(0, currentSessionId);
            } catch (Exception e) {
                Log.w(TAG, "BassBoost init failed: " + e.getMessage());
                bassBoost = null;
            }

            try {
                loudnessEnhancer = new LoudnessEnhancer(currentSessionId);
            } catch (Exception e) {
                Log.w(TAG, "LoudnessEnhancer init failed: " + e.getMessage());
                loudnessEnhancer = null;
            }

            applyEffectsLocked();
        }
    }

    private void applyEffectsLocked() {
        if (equalizer != null) {
            try {
                short numBands = equalizer.getNumberOfBands();
                short[] range = equalizer.getBandLevelRange();
                short minMb = range != null && range.length >= 2 ? range[0] : -1500;
                short maxMb = range != null && range.length >= 2 ? range[1] : 1500;
                for (short b = 0; b < numBands; b++) {
                    int target = (enabled && b < desiredBandsMb.length) ? desiredBandsMb[b] : 0;
                    short clamped = (short) Math.max(minMb, Math.min(maxMb, target));
                    equalizer.setBandLevel(b, clamped);
                }
                equalizer.setEnabled(enabled);
            } catch (Exception e) {
                Log.w(TAG, "Equalizer apply failed: " + e.getMessage());
            }
        }

        if (bassBoost != null) {
            try {
                boolean active = enabled && desiredBassStrength > 0;
                if (bassBoost.getStrengthSupported()) {
                    bassBoost.setStrength((short) Math.max(0, Math.min(1000, active ? desiredBassStrength : 0)));
                }
                bassBoost.setEnabled(active);
            } catch (Exception e) {
                Log.w(TAG, "BassBoost apply failed: " + e.getMessage());
            }
        }

        if (loudnessEnhancer != null) {
            try {
                boolean active = enabled && desiredLoudnessGainMb > 0;
                loudnessEnhancer.setTargetGain(active ? Math.max(0, Math.min(1200, desiredLoudnessGainMb)) : 0);
                loudnessEnhancer.setEnabled(active);
            } catch (Exception e) {
                Log.w(TAG, "LoudnessEnhancer apply failed: " + e.getMessage());
            }
        }
    }

    @ReactMethod
    public void bindAudioSession(int sessionId, Promise promise) {
        attachToSession(sessionId);
        promise.resolve(currentSessionId);
    }

    @ReactMethod
    public void setEffectConfig(boolean isEnabled, ReadableArray bandLevels, int bassStrength, int loudnessGainMb, Promise promise) {
        synchronized (lock) {
            this.enabled = isEnabled;
            if (bandLevels != null && bandLevels.size() > 0) {
                int[] next = new int[bandLevels.size()];
                for (int i = 0; i < bandLevels.size(); i++) {
                    next[i] = bandLevels.getInt(i);
                }
                this.desiredBandsMb = next;
            }
            this.desiredBassStrength = Math.max(0, Math.min(1000, bassStrength));
            this.desiredLoudnessGainMb = Math.max(0, Math.min(1200, loudnessGainMb));
            applyEffectsLocked();
        }
        promise.resolve(true);
    }

    @ReactMethod
    public void getEffectInfo(Promise promise) {
        synchronized (lock) {
            WritableMap result = Arguments.createMap();
            result.putInt("audioSessionId", currentSessionId);
            WritableArray bandsArr = Arguments.createArray();

            if (equalizer != null) {
                try {
                    short[] range = equalizer.getBandLevelRange();
                    short minMb = range != null && range.length >= 2 ? range[0] : -1500;
                    short maxMb = range != null && range.length >= 2 ? range[1] : 1500;
                    short count = equalizer.getNumberOfBands();
                    result.putBoolean("supported", true);
                    result.putInt("minLevel", minMb);
                    result.putInt("maxLevel", maxMb);
                    for (short b = 0; b < count; b++) {
                        WritableMap bandMap = Arguments.createMap();
                        bandMap.putInt("index", b);
                        bandMap.putInt("centerFreqHz", equalizer.getCenterFreq(b) / 1000);
                        bandMap.putInt("level", b < desiredBandsMb.length ? desiredBandsMb[b] : equalizer.getBandLevel(b));
                        bandsArr.pushMap(bandMap);
                    }
                    result.putArray("bands", bandsArr);
                    promise.resolve(result);
                    return;
                } catch (Exception ignored) {}
            }

            result.putBoolean("supported", true);
            result.putInt("minLevel", -1500);
            result.putInt("maxLevel", 1500);
            for (int i = 0; i < FALLBACK_FREQS_HZ.length; i++) {
                WritableMap bandMap = Arguments.createMap();
                bandMap.putInt("index", i);
                bandMap.putInt("centerFreqHz", FALLBACK_FREQS_HZ[i]);
                bandMap.putInt("level", i < desiredBandsMb.length ? desiredBandsMb[i] : 0);
                bandsArr.pushMap(bandMap);
            }
            result.putArray("bands", bandsArr);
            promise.resolve(result);
        }
    }
}
