package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.View;

import androidx.annotation.NonNull;

/**
 * M3 Expressive wavy progress indicator for PlayDetail and PlayerBar.
 *
 * Draws a gentle animated sine wave on the played portion while playing and
 * smoothly eases to a crisp flat track when paused or dragging.
 */
public class WavyProgressView extends View {
  private static final float TWO_PI = (float) (Math.PI * 2.0);
  private static final float EPSILON = 0.005f;

  private final Paint activePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint bufferedPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint thumbPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Path wavePath = new Path();
  private final RectF thumbRect = new RectF();

  private float progress = 0f;
  private float buffered = 0f;
  private boolean playing = false;
  private boolean dragging = false;

  private float amplitudeDp = 2.3f;
  private float wavelengthDp = 34f;
  private float waveSpeed = 1.8f;
  private float strokeWidthDp = 3.4f;
  private float inactiveStrokeWidthDp = 3.0f;
  private boolean showThumb = true;
  private float thumbGapDp = 5.5f;
  private float thumbWidthDp = 4.5f;
  private float thumbHeightDp = 17f;

  private float ampFactor = 0f;
  private float dragFactor = 0f;
  private float phaseRad = 0f;
  private long lastFrameNs = 0L;

  private boolean isAttached = false;
  private boolean windowVisible = true;
  private boolean frameScheduled = false;
  private boolean hasDrawnOnce = false;

  public WavyProgressView(Context context) {
    super(context);
    activePaint.setStyle(Paint.Style.STROKE);
    activePaint.setStrokeCap(Paint.Cap.ROUND);
    activePaint.setStrokeJoin(Paint.Join.ROUND);
    activePaint.setColor(0xFF4DAF7C);

    bufferedPaint.setStyle(Paint.Style.STROKE);
    bufferedPaint.setStrokeCap(Paint.Cap.ROUND);
    bufferedPaint.setColor(0x474DAF7C);

    trackPaint.setStyle(Paint.Style.STROKE);
    trackPaint.setStrokeCap(Paint.Cap.ROUND);
    trackPaint.setColor(0x28000000);

    thumbPaint.setStyle(Paint.Style.FILL);
    thumbPaint.setColor(0xFF4DAF7C);
  }

  private static float clamp01(float value) {
    if (Float.isNaN(value) || value < 0f) return 0f;
    if (value > 1f) return 1f;
    return value;
  }

  public void setProgress(float progress) {
    float next = clamp01(progress);
    if (Math.abs(this.progress - next) > 0.0001f) {
      this.progress = next;
      invalidate();
    }
  }

  public void setBuffered(float buffered) {
    float next = clamp01(buffered);
    if (Math.abs(this.buffered - next) > 0.0001f) {
      this.buffered = next;
      invalidate();
    }
  }

  public void setPlaying(boolean playing) {
    if (this.playing == playing) return;
    this.playing = playing;
    lastFrameNs = 0L;
    scheduleNextFrameIfNeeded();
    invalidate();
  }

  public void setDragging(boolean dragging) {
    if (this.dragging == dragging) return;
    this.dragging = dragging;
    lastFrameNs = 0L;
    scheduleNextFrameIfNeeded();
    invalidate();
  }

  public void setActiveColor(int color) {
    if (activePaint.getColor() != color) {
      activePaint.setColor(color);
      thumbPaint.setColor(color);
      invalidate();
    }
  }

  public void setBufferedColor(int color) {
    if (bufferedPaint.getColor() != color) {
      bufferedPaint.setColor(color);
      invalidate();
    }
  }

  public void setTrackColor(int color) {
    if (trackPaint.getColor() != color) {
      trackPaint.setColor(color);
      invalidate();
    }
  }

  public void setAmplitude(float amplitudeDp) {
    float next = Math.max(0f, amplitudeDp);
    if (this.amplitudeDp != next) {
      this.amplitudeDp = next;
      invalidate();
    }
  }

  public void setWavelength(float wavelengthDp) {
    float next = Math.max(8f, wavelengthDp);
    if (this.wavelengthDp != next) {
      this.wavelengthDp = next;
      invalidate();
    }
  }

  public void setWaveSpeed(float waveSpeed) {
    float next = Math.max(0f, waveSpeed);
    if (this.waveSpeed != next) {
      this.waveSpeed = next;
      invalidate();
    }
  }

  public void setStrokeWidthDp(float strokeWidthDp) {
    float next = Math.max(1f, strokeWidthDp);
    if (this.strokeWidthDp != next) {
      this.strokeWidthDp = next;
      invalidate();
    }
  }

  public void setInactiveStrokeWidthDp(float inactiveStrokeWidthDp) {
    float next = Math.max(1f, inactiveStrokeWidthDp);
    if (this.inactiveStrokeWidthDp != next) {
      this.inactiveStrokeWidthDp = next;
      invalidate();
    }
  }

  public void setShowThumb(boolean showThumb) {
    if (this.showThumb != showThumb) {
      this.showThumb = showThumb;
      invalidate();
    }
  }

  public void setThumbGapDp(float thumbGapDp) {
    float next = Math.max(0f, thumbGapDp);
    if (this.thumbGapDp != next) {
      this.thumbGapDp = next;
      invalidate();
    }
  }

  public void setThumbWidthDp(float thumbWidthDp) {
    float next = Math.max(1f, thumbWidthDp);
    if (this.thumbWidthDp != next) {
      this.thumbWidthDp = next;
      invalidate();
    }
  }

  public void setThumbHeightDp(float thumbHeightDp) {
    float next = Math.max(2f, thumbHeightDp);
    if (this.thumbHeightDp != next) {
      this.thumbHeightDp = next;
      invalidate();
    }
  }

  private boolean shouldAnimate() {
    float targetAmp = (playing && !dragging) ? 1f : 0f;
    float targetDrag = dragging ? 1f : 0f;
    return isAttached && windowVisible && isShown() && (
      (playing && !dragging) ||
      Math.abs(targetAmp - ampFactor) >= EPSILON ||
      Math.abs(targetDrag - dragFactor) >= EPSILON
    );
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

  @Override
  protected void onVisibilityChanged(@NonNull View changedView, int visibility) {
    super.onVisibilityChanged(changedView, visibility);
    lastFrameNs = 0L;
    if (visibility == VISIBLE) {
      scheduleNextFrameIfNeeded();
    }
  }

  private void drawWavySegment(
    Canvas canvas,
    float x1,
    float x2,
    float cy,
    float ampPx,
    float wavelengthPx,
    float fadeLenPx,
    float density
  ) {
    wavePath.reset();
    float step = Math.max(2f, density * 1.5f);
    float k = TWO_PI / Math.max(8f * density, wavelengthPx);
    boolean started = false;
    for (float x = x1; x < x2; x += step) {
      float edgeFade = Math.min(1f, Math.min((x - x1) / fadeLenPx, (x2 - x) / fadeLenPx));
      float y = cy + (float) Math.sin(x * k - phaseRad) * ampPx * Math.max(0f, edgeFade);
      if (!started) {
        wavePath.moveTo(x, y);
        started = true;
      } else {
        wavePath.lineTo(x, y);
      }
    }
    if (!started) {
      wavePath.moveTo(x1, cy);
    }
    wavePath.lineTo(x2, cy);
    canvas.drawPath(wavePath, activePaint);
  }

  @Override
  protected void onDraw(Canvas canvas) {
    frameScheduled = false;
    final int width = getWidth();
    final int height = getHeight();
    if (width <= 0 || height <= 0) return;

    final long nowNs = System.nanoTime();
    float dt = 0f;
    if (lastFrameNs != 0L) {
      double rawDt = (nowNs - lastFrameNs) / 1_000_000_000.0;
      if (rawDt > 0.0 && rawDt < 0.1) {
        dt = (float) rawDt;
      }
    }
    lastFrameNs = nowNs;

    float targetAmp = (playing && !dragging) ? 1f : 0f;
    float targetDrag = dragging ? 1f : 0f;
    if (!hasDrawnOnce) {
      hasDrawnOnce = true;
      ampFactor = targetAmp;
      dragFactor = targetDrag;
    } else if (dt > 0f) {
      ampFactor += (targetAmp - ampFactor) * Math.min(1f, dt * 11f);
      if (Math.abs(targetAmp - ampFactor) < EPSILON) ampFactor = targetAmp;

      dragFactor += (targetDrag - dragFactor) * Math.min(1f, dt * 14f);
      if (Math.abs(targetDrag - dragFactor) < EPSILON) dragFactor = targetDrag;

      if (playing && !dragging) {
        phaseRad = (phaseRad + dt * waveSpeed) % TWO_PI;
      }
    }

    final float density = getResources().getDisplayMetrics().density;
    final float cy = height * 0.5f;
    final float wavelengthPx = wavelengthDp * density;

    if (showThumb) {
      float curThumbW = (thumbWidthDp + 1.2f * dragFactor) * density;
      float curThumbH = (thumbHeightDp + 4.0f * dragFactor) * density;
      float padX = Math.max(curThumbW * 0.5f + 2f * density, strokeWidthDp * 0.5f * density);
      float trackStart = padX;
      float trackEnd = width - padX;
      float trackW = Math.max(1f, trackEnd - trackStart);
      float curX = trackStart + trackW * progress;
      float bufX = trackStart + trackW * Math.max(progress, buffered);
      float gapPx = thumbGapDp * density;
      float activeEnd = Math.max(trackStart, curX - curThumbW * 0.5f - gapPx);
      float inactiveStart = Math.min(trackEnd, curX + curThumbW * 0.5f + gapPx);

      float rightStrokePx = inactiveStrokeWidthDp * density;
      trackPaint.setStrokeWidth(rightStrokePx);
      bufferedPaint.setStrokeWidth(rightStrokePx);

      if (inactiveStart < trackEnd) {
        canvas.drawLine(inactiveStart, cy, trackEnd, cy, trackPaint);
        if (bufX > inactiveStart) {
          canvas.drawLine(inactiveStart, cy, Math.min(trackEnd, bufX), cy, bufferedPaint);
        }
      }

      float curAmp = amplitudeDp * density * ampFactor;
      if (activeEnd > trackStart) {
        if (curAmp > 0.15f && activeEnd - trackStart > 2f * density) {
          activePaint.setStrokeWidth(strokeWidthDp * density);
          drawWavySegment(canvas, trackStart, activeEnd, cy, curAmp, wavelengthPx, 8f * density, density);
        } else {
          activePaint.setStrokeWidth((strokeWidthDp + 0.4f) * density);
          canvas.drawLine(trackStart, cy, activeEnd, cy, activePaint);
        }
      }

      thumbRect.set(
        curX - curThumbW * 0.5f,
        cy - curThumbH * 0.5f,
        curX + curThumbW * 0.5f,
        cy + curThumbH * 0.5f
      );
      canvas.drawRoundRect(thumbRect, curThumbW * 0.5f, curThumbW * 0.5f, thumbPaint);
    } else {
      float curStrokePx = (strokeWidthDp + 1.2f * dragFactor) * density;
      float padX = curStrokePx * 0.5f + 1f * density;
      float trackStart = padX;
      float trackEnd = width - padX;
      float trackW = Math.max(1f, trackEnd - trackStart);
      float curX = trackStart + trackW * progress;
      float bufX = trackStart + trackW * Math.max(progress, buffered);

      float rightStrokePx = (inactiveStrokeWidthDp + 1.2f * dragFactor) * density;
      trackPaint.setStrokeWidth(rightStrokePx);
      bufferedPaint.setStrokeWidth(rightStrokePx);

      canvas.drawLine(trackStart, cy, trackEnd, cy, trackPaint);
      if (bufX > trackStart) {
        canvas.drawLine(trackStart, cy, Math.min(trackEnd, bufX), cy, bufferedPaint);
      }

      float curAmp = amplitudeDp * density * ampFactor;
      if (curX > trackStart) {
        activePaint.setStrokeWidth(curStrokePx);
        if (curAmp > 0.1f && curX - trackStart > 2f * density) {
          drawWavySegment(canvas, trackStart, curX, cy, curAmp, wavelengthPx, 6f * density, density);
        } else {
          canvas.drawLine(trackStart, cy, curX, cy, activePaint);
        }
      }
    }

    scheduleNextFrameIfNeeded();
  }
}
