package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Shader;

import com.facebook.react.views.view.ReactViewGroup;

import java.util.ArrayList;
import java.util.List;

/**
 * Container view that smoothly fades its children's top and bottom edges to transparent
 * using a multi-stop PorterDuff DST_IN alpha gradient so artwork clears header text above
 * and melts cleanly into action controls below across solid and dynamic backgrounds.
 */
public class AlphaFadeView extends ReactViewGroup {
  private final Paint maskPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
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

    List<Float> posList = new ArrayList<>(12);
    List<Integer> colorList = new ArrayList<>(12);

    if (hasTop) {
      posList.add(0f);
      colorList.add(0x00FFFFFF);
      if (tStart > 0.002f) {
        posList.add(tStart);
        colorList.add(0x00FFFFFF);
      }
      float tSpan = tEnd - tStart;
      posList.add(tStart + tSpan * 0.25f);
      colorList.add(0x45FFFFFF);
      posList.add(tStart + tSpan * 0.58f);
      colorList.add(0xADFFFFFF);
      posList.add(tStart + tSpan * 0.85f);
      colorList.add(0xE8FFFFFF);
      posList.add(tEnd);
      colorList.add(0xFFFFFFFF);
    } else {
      posList.add(0f);
      colorList.add(0xFFFFFFFF);
    }

    if (hasBottom) {
      float bSpan = bEnd - bStart;
      if (bStart > posList.get(posList.size() - 1) + 0.001f) {
        posList.add(bStart);
        colorList.add(0xFFFFFFFF);
      }
      posList.add(bStart + bSpan * 0.35f);
      colorList.add(0xB8FFFFFF);
      posList.add(bStart + bSpan * 0.70f);
      colorList.add(0x40FFFFFF);
      posList.add(bEnd);
      colorList.add(0x00FFFFFF);
      if (bEnd < 0.999f) {
        posList.add(1f);
        colorList.add(0x00FFFFFF);
      }
    } else {
      posList.add(1f);
      colorList.add(0xFFFFFFFF);
    }

    float[] positions = new float[posList.size()];
    int[] colors = new int[colorList.size()];
    for (int i = 0; i < posList.size(); i++) {
      positions[i] = posList.get(i);
      colors[i] = colorList.get(i);
    }

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
