package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.view.View;

import java.util.Arrays;

/**
 * 120Hz Banding-Free Native Fluid Mesh Background View.
 *
 * Combines 4 slowly drifting Lissajous radial-mesh orbs (using 5-stop Hermite
 * smooth falloff + unit-space Shader Matrix transforms for zero per-frame
 * allocations) with a cached 64x64 Interleaved Gradient Noise (IGN) micro-dither
 * tile that eliminates 8-bit Mach banding rings on OLED panels.
 */
public class FluidBgView extends View {
  private static final int ORB_COUNT = 4;
  private static final long TRANSITION_DURATION_NS = 760_000_000L;
  private static final float[] GRADIENT_STOPS = new float[]{0f, 0.28f, 0.56f, 0.82f, 1.0f};
  private static final float[] ALPHA_FALLOFF = new float[]{1.00f, 0.74f, 0.36f, 0.09f, 0.0f};

  private static BitmapShader sNoiseShader = null;

  private final Paint basePaint = new Paint(Paint.DITHER_FLAG);
  private final Paint[] orbPaints = new Paint[ORB_COUNT];
  private final RadialGradient[] orbShaders = new RadialGradient[ORB_COUNT];
  private final Matrix shaderMatrix = new Matrix();
  private final Paint noisePaint = new Paint(Paint.DITHER_FLAG);
  private final int[] scratchStopColors = new int[5];

  private int startBaseColor = 0xFF141316;
  private int targetBaseColor = 0xFF141316;
  private int currentBaseColor = 0xFF141316;

  private final int[] startOrbColors = new int[]{
    0x664DAF7C, 0x523B82CE, 0x477C5CCC, 0x3D2D6A4F
  };
  private final int[] targetOrbColors = new int[]{
    0x664DAF7C, 0x523B82CE, 0x477C5CCC, 0x3D2D6A4F
  };
  private final int[] currentOrbColors = new int[]{
    0x664DAF7C, 0x523B82CE, 0x477C5CCC, 0x3D2D6A4F
  };

  private boolean hasInitialBaseColor = false;
  private boolean hasInitialOrbColors = false;
  private boolean transitionActive = false;
  private long transitionStartNs = 0L;

  private boolean playing = false;
  private boolean isAttached = false;
  private boolean windowVisible = true;
  private boolean frameScheduled = false;

  private double accumulatedPhaseSec = 0.0;
  private long lastFrameNs = 0L;

  public FluidBgView(Context context) {
    super(context);
    for (int i = 0; i < ORB_COUNT; i++) {
      orbPaints[i] = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
    }
    ensureNoiseShader();
    if (sNoiseShader != null) {
      noisePaint.setShader(sNoiseShader);
    }
    rebuildOrbShaders();
  }

  private static synchronized void ensureNoiseShader() {
    if (sNoiseShader != null) return;
    final int size = 64;
    Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
    int[] pixels = new int[size * size];
    for (int y = 0; y < size; y++) {
      for (int x = 0; x < size; x++) {
        // Interleaved Gradient Noise (Jimenez 2014) -> uniform spatial blue-like spectrum
        double inner = 0.06711056 * x + 0.00583715 * y;
        double ign = fract(52.9829189 * fract(inner));
        // Zero-mean +/- micro-dither (alpha 3..5 out of 255) breaks 8-bit Mach bands invisibly
        boolean bright = ign >= 0.5;
        double mag = Math.abs(ign - 0.5) * 2.0; // 0..1
        int alpha = 2 + (int) Math.round(mag * 4.0); // 2..6 (~0.8% - 2.3%)
        pixels[y * size + x] = bright
          ? Color.argb(alpha, 255, 255, 255)
          : Color.argb(alpha, 0, 0, 0);
      }
    }
    bmp.setPixels(pixels, 0, size, 0, 0, size, size);
    sNoiseShader = new BitmapShader(bmp, Shader.TileMode.REPEAT, Shader.TileMode.REPEAT);
  }

  private static double fract(double v) {
    return v - Math.floor(v);
  }

  public void setBaseColorValue(int color) {
    if (!hasInitialBaseColor) {
      hasInitialBaseColor = true;
      startBaseColor = color;
      targetBaseColor = color;
      currentBaseColor = color;
      invalidate();
      return;
    }
    if (targetBaseColor == color) return;
    startBaseColor = currentBaseColor;
    targetBaseColor = color;
    startColorTransition();
  }

  public void setOrbColors(int[] colors) {
    if (colors == null || colors.length == 0) return;
    int[] normalized = new int[ORB_COUNT];
    for (int i = 0; i < ORB_COUNT; i++) {
      normalized[i] = colors[i % colors.length];
    }
    if (!hasInitialOrbColors) {
      hasInitialOrbColors = true;
      System.arraycopy(normalized, 0, startOrbColors, 0, ORB_COUNT);
      System.arraycopy(normalized, 0, targetOrbColors, 0, ORB_COUNT);
      System.arraycopy(normalized, 0, currentOrbColors, 0, ORB_COUNT);
      rebuildOrbShaders();
      invalidate();
      return;
    }
    if (Arrays.equals(targetOrbColors, normalized)) return;
    System.arraycopy(currentOrbColors, 0, startOrbColors, 0, ORB_COUNT);
    System.arraycopy(normalized, 0, targetOrbColors, 0, ORB_COUNT);
    startColorTransition();
  }

  public void setPlaying(boolean playing) {
    if (this.playing == playing) return;
    this.playing = playing;
    lastFrameNs = 0L;
    scheduleNextFrameIfNeeded();
  }

  private void startColorTransition() {
    System.arraycopy(currentOrbColors, 0, startOrbColors, 0, ORB_COUNT);
    startBaseColor = currentBaseColor;
    transitionStartNs = System.nanoTime();
    transitionActive = true;
    scheduleNextFrameIfNeeded();
    invalidate();
  }

  private boolean shouldAnimate() {
    return isAttached && windowVisible && (playing || transitionActive);
  }

  private void scheduleNextFrameIfNeeded() {
    if (shouldAnimate() && !frameScheduled) {
      frameScheduled = true;
      postInvalidateOnAnimation();
    }
  }

  @Override
  protected void onAttachedToWindow() {
    super.onAttachedToWindow();
    isAttached = true;
    lastFrameNs = 0L;
    scheduleNextFrameIfNeeded();
  }

  @Override
  protected void onDetachedFromWindow() {
    isAttached = false;
    frameScheduled = false;
    lastFrameNs = 0L;
    super.onDetachedFromWindow();
  }

  @Override
  protected void onWindowVisibilityChanged(int visibility) {
    super.onWindowVisibilityChanged(visibility);
    windowVisible = (visibility == VISIBLE);
    lastFrameNs = 0L;
    if (windowVisible) {
      scheduleNextFrameIfNeeded();
    }
  }

  private void rebuildOrbShaders() {
    for (int i = 0; i < ORB_COUNT; i++) {
      int c = currentOrbColors[i];
      int baseAlpha = Color.alpha(c);
      int r = Color.red(c);
      int g = Color.green(c);
      int b = Color.blue(c);
      for (int s = 0; s < GRADIENT_STOPS.length; s++) {
        int a = Math.min(255, Math.max(0, Math.round(baseAlpha * ALPHA_FALLOFF[s])));
        scratchStopColors[s] = Color.argb(a, r, g, b);
      }
      orbShaders[i] = new RadialGradient(
        0f,
        0f,
        1f,
        scratchStopColors.clone(),
        GRADIENT_STOPS,
        Shader.TileMode.CLAMP
      );
      orbPaints[i].setShader(orbShaders[i]);
    }
  }

  private static int lerpArgb(int start, int end, float t) {
    int a = Math.round(Color.alpha(start) + (Color.alpha(end) - Color.alpha(start)) * t);
    int r = Math.round(Color.red(start) + (Color.red(end) - Color.red(start)) * t);
    int g = Math.round(Color.green(start) + (Color.green(end) - Color.green(start)) * t);
    int b = Math.round(Color.blue(start) + (Color.blue(end) - Color.blue(start)) * t);
    return Color.argb(a, r, g, b);
  }

  @Override
  protected void onDraw(Canvas canvas) {
    frameScheduled = false;
    final int width = getWidth();
    final int height = getHeight();
    if (width <= 0 || height <= 0) return;

    final long nowNs = System.nanoTime();
    if (playing) {
      if (lastFrameNs != 0L) {
        double dt = (nowNs - lastFrameNs) / 1_000_000_000.0;
        if (dt > 0.0 && dt < 0.1) {
          accumulatedPhaseSec += dt;
        }
      }
      lastFrameNs = nowNs;
    } else {
      lastFrameNs = 0L;
    }

    if (transitionActive) {
      float raw = (nowNs - transitionStartNs) / (float) TRANSITION_DURATION_NS;
      if (raw >= 1.0f) {
        transitionActive = false;
        currentBaseColor = targetBaseColor;
        System.arraycopy(targetOrbColors, 0, currentOrbColors, 0, ORB_COUNT);
      } else {
        float clamped = Math.max(0f, raw);
        float inv = 1.0f - clamped;
        float eased = 1.0f - inv * inv * inv;
        currentBaseColor = lerpArgb(startBaseColor, targetBaseColor, eased);
        for (int i = 0; i < ORB_COUNT; i++) {
          currentOrbColors[i] = lerpArgb(startOrbColors[i], targetOrbColors[i], eased);
        }
      }
      rebuildOrbShaders();
    }

    // 1. Base surface fill
    basePaint.setColor(currentBaseColor);
    canvas.drawRect(0f, 0f, width, height, basePaint);

    // 2. Four overlapping drifting radial mesh orbs (Lissajous trajectories)
    final float maxDim = Math.max(width, height);
    final double t = accumulatedPhaseSec;

    // Orb 0: Top-left primary glow
    drawOrb(
      canvas, 0, width, height,
      width * (0.20f + 0.16f * (float) Math.sin(t * 0.27 + 0.4)),
      height * (0.18f + 0.13f * (float) Math.cos(t * 0.21 + 0.2)),
      maxDim * (0.78f + 0.05f * (float) Math.sin(t * 0.33))
    );

    // Orb 1: Top-right secondary glow
    drawOrb(
      canvas, 1, width, height,
      width * (0.82f + 0.14f * (float) Math.cos(t * 0.23 + 1.7)),
      height * (0.30f + 0.15f * (float) Math.sin(t * 0.19 + 1.1)),
      maxDim * (0.74f + 0.05f * (float) Math.cos(t * 0.29 + 0.8))
    );

    // Orb 2: Center-left warm/tertiary accent
    drawOrb(
      canvas, 2, width, height,
      width * (0.26f + 0.18f * (float) Math.cos(t * 0.18 + 3.1)),
      height * (0.68f + 0.14f * (float) Math.sin(t * 0.24 + 2.4)),
      maxDim * (0.72f + 0.04f * (float) Math.sin(t * 0.25 + 2.0))
    );

    // Orb 3: Bottom-right ambient depth
    drawOrb(
      canvas, 3, width, height,
      width * (0.78f + 0.15f * (float) Math.sin(t * 0.20 + 4.5)),
      height * (0.82f + 0.12f * (float) Math.cos(t * 0.16 + 3.8)),
      maxDim * (0.80f + 0.05f * (float) Math.cos(t * 0.22 + 3.1))
    );

    // 3. Anti-Mach-banding IGN micro-dither pass
    if (sNoiseShader != null) {
      canvas.drawRect(0f, 0f, width, height, noisePaint);
    }

    scheduleNextFrameIfNeeded();
  }

  private void drawOrb(Canvas canvas, int idx, int width, int height, float cx, float cy, float radius) {
    RadialGradient shader = orbShaders[idx];
    if (shader == null || radius <= 1f) return;
    shaderMatrix.setScale(radius, radius);
    shaderMatrix.postTranslate(cx, cy);
    shader.setLocalMatrix(shaderMatrix);
    canvas.drawRect(0f, 0f, width, height, orbPaints[idx]);
  }
}
