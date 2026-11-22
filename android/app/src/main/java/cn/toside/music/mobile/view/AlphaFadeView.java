package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Shader;

import com.facebook.react.views.view.ReactViewGroup;

/**
 * Container view that smoothly fades its children's top and bottom edges to transparent
 * using a multi-stop PorterDuff DST_IN alpha gradient so artwork clears header text above
 * and melts cleanly into action controls below across solid and dynamic backgrounds.
 */
public class AlphaFadeView extends ReactViewGroup {
  private final Paint maskPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
  private final float[] posScratch = new float[12];
  private final int[] colorScratch = new int[12];

  private float topFadeStart = 0.0f;
  private float topFadeEnd = 0.0f;
  private float fadeStart = 0.60f;
  private float fadeEnd = 1.0f;

  private int cachedHeight = -1;
  private float cachedTopStart = -1f;
  private float cachedTopEnd = -1f;
  private float cachedStart = -1f;
  private float cachedEnd = -1f;

  public AlphaFadeView(Context context) {
    super(context);
    maskPaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_IN));
  }

  public void setTopFadeStart(float start) {
    float clamped = Math.max(0f, Math.min(0.45f, start));
    if (this.topFadeStart != clamped) {
      this.topFadeStart = clamped;
      invalidate();
    }
  }

  public void setTopFadeEnd(float end) {
    float clamped = Math.max(0f, Math.min(0.49f, end));
    if (this.topFadeEnd != clamped) {
      this.topFadeEnd = clamped;
      invalidate();
    }
  }

  public void setFadeStart(float start) {
    float clamped = Math.max(0f, Math.min(0.98f, start));
    if (this.fadeStart != clamped) {
      this.fadeStart = clamped;
      invalidate();
    }
  }

  public void setFadeEnd(float end) {
    float clamped = Math.max(0.02f, Math.min(1f, end));
    if (this.fadeEnd != clamped) {
      this.fadeEnd = clamped;
      invalidate();
    }
  }

  private void ensureShader(int height) {
    float tStart = Math.max(0f, Math.min(0.45f, topFadeStart));
    float tEnd = Math.max(tStart, Math.min(0.49f, topFadeEnd));
    float bStart = Math.max(tEnd, Math.min(0.98f, fadeStart));
    float bEnd = Math.max(bStart, Math.min(1f, fadeEnd));

    if (cachedHeight == height
      && cachedTopStart == tStart
      && cachedTopEnd == tEnd
      && cachedStart == bStart
      && cachedEnd == bEnd) {
      return;
    }

    cachedHeight = height;
    cachedTopStart = tStart;
    cachedTopEnd = tEnd;
    cachedStart = bStart;
    cachedEnd = bEnd;

    boolean hasTop = (tEnd - tStart) > 0.005f;
    boolean hasBottom = (bEnd - bStart) > 0.005f;

    int count = 0;
    if (hasTop) {
      posScratch[count] = 0f;
      colorScratch[count++] = 0x00FFFFFF;
      if (tStart > 0.002f) {
        posScratch[count] = tStart;
        colorScratch[count++] = 0x00FFFFFF;
      }
      float tSpan = tEnd - tStart;
      posScratch[count] = tStart + tSpan * 0.25f;
      colorScratch[count++] = 0x45FFFFFF;
      posScratch[count] = tStart + tSpan * 0.58f;
      colorScratch[count++] = 0xADFFFFFF;
      posScratch[count] = tStart + tSpan * 0.85f;
      colorScratch[count++] = 0xE8FFFFFF;
      posScratch[count] = tEnd;
      colorScratch[count++] = 0xFFFFFFFF;
    } else {
      posScratch[count] = 0f;
      colorScratch[count++] = 0xFFFFFFFF;
    }

    if (hasBottom) {
      float bSpan = bEnd - bStart;
      if (bStart > posScratch[count - 1] + 0.001f) {
        posScratch[count] = bStart;
        colorScratch[count++] = 0xFFFFFFFF;
      }
      posScratch[count] = bStart + bSpan * 0.35f;
      colorScratch[count++] = 0xB8FFFFFF;
      posScratch[count] = bStart + bSpan * 0.70f;
      colorScratch[count++] = 0x40FFFFFF;
      posScratch[count] = bEnd;
      colorScratch[count++] = 0x00FFFFFF;
      if (bEnd < 0.999f) {
        posScratch[count] = 1f;
        colorScratch[count++] = 0x00FFFFFF;
      }
    } else {
      posScratch[count] = 1f;
      colorScratch[count++] = 0xFFFFFFFF;
    }

    float[] positions = new float[count];
    int[] colors = new int[count];
    System.arraycopy(posScratch, 0, positions, 0, count);
    System.arraycopy(colorScratch, 0, colors, 0, count);

    maskPaint.setShader(new LinearGradient(0f, 0f, 0f, height, colors, positions, Shader.TileMode.CLAMP));
  }

  @Override
  protected void dispatchDraw(Canvas canvas) {
    int width = getWidth();
    int height = getHeight();
    boolean hasTop = (topFadeEnd - topFadeStart) > 0.005f;
    boolean hasBottom = (fadeEnd - fadeStart) > 0.005f;
    if (width <= 0 || height <= 0 || (!hasTop && !hasBottom)) {
      super.dispatchDraw(canvas);
      return;
    }

    ensureShader(height);
    int saveCount = canvas.saveLayer(0f, 0f, width, height, null);
    super.dispatchDraw(canvas);
    canvas.drawRect(0f, 0f, width, height, maskPaint);
    canvas.restoreToCount(saveCount);
  }
}
