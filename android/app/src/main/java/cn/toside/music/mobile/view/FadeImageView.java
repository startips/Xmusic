package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.SystemClock;

import androidx.annotation.Nullable;

import com.facebook.drawee.controller.AbstractDraweeControllerBuilder;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.views.image.GlobalImageLoadListener;
import com.facebook.react.views.image.ReactImageView;

/**
 * ReactImageView subclass that applies top/bottom DST_IN alpha edge fades directly
 * on the image surface so shared-element transitions smoothly melt edges in lockstep
 * with the flight animation rather than snapping onto the image after arrival.
 */
public class FadeImageView extends ReactImageView {
  private static final long TRANSITION_WINDOW_MS = 650L;

  private final Paint maskPaint = new Paint(Paint.DITHER_FLAG);
  private final Path clipPath = new Path();
  private final RectF clipRectF = new RectF();
  private final Rect clipBoundsRect = new Rect();
  private final float[] posScratch = new float[24];
  private final int[] colorScratch = new int[24];

  private float topFadeStart = 0.04f;
  private float topFadeEnd = 0.22f;
  private float fadeStart = 0.54f;
  private float fadeEnd = 0.98f;
  private float startCornerRadiusPx;

  private long attachTimeMs = 0L;
  private boolean hasAnimatedClip = false;
  private boolean transitionComplete = false;
  private int initialClipWidth = 0;
  private int initialClipHeight = 0;

  private int cachedTop = Integer.MIN_VALUE;
  private int cachedHeight = -1;
  private float cachedTopStart = -1f;
  private float cachedTopEnd = -1f;
  private float cachedStart = -1f;
  private float cachedEnd = -1f;
  private int cachedProgressStep = -1;

  public FadeImageView(
    Context context,
    AbstractDraweeControllerBuilder draweeControllerBuilder,
    @Nullable GlobalImageLoadListener globalImageLoadListener,
    @Nullable Object callerContext
  ) {
    super(context, draweeControllerBuilder, globalImageLoadListener, callerContext);
    maskPaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_IN));
    startCornerRadiusPx = PixelUtil.toPixelFromDIP(12f);
  }

  @Override
  protected void onAttachedToWindow() {
    super.onAttachedToWindow();
    attachTimeMs = SystemClock.uptimeMillis();
    hasAnimatedClip = false;
    transitionComplete = false;
    initialClipWidth = 0;
    initialClipHeight = 0;
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

  public void setStartCornerRadius(float radiusDp) {
    float radiusPx = PixelUtil.toPixelFromDIP(Math.max(0f, radiusDp));
    if (this.startCornerRadiusPx != radiusPx) {
      this.startCornerRadiusPx = radiusPx;
      invalidate();
    }
  }

  @Override
  public boolean hasOverlappingRendering() {
    return true;
  }

  private static int lerpAlphaColor(int targetAlpha, float progress) {
    int alpha = Math.max(0, Math.min(255, Math.round(255f + (targetAlpha - 255f) * progress)));
    return (alpha << 24) | 0x00FFFFFF;
  }

  private void ensureShader(int top, int height, float progress) {
    float tStart = Math.max(0f, Math.min(0.45f, topFadeStart));
    float tEnd = Math.max(tStart, Math.min(0.49f, topFadeEnd));
    float bStart = Math.max(tEnd, Math.min(0.98f, fadeStart));
    float bEnd = Math.max(bStart, Math.min(1f, fadeEnd));
    int progressStep = Math.round(progress * 100f);

    if (cachedTop == top
      && cachedHeight == height
      && cachedTopStart == tStart
      && cachedTopEnd == tEnd
      && cachedStart == bStart
      && cachedEnd == bEnd
      && cachedProgressStep == progressStep) {
      return;
    }

    cachedTop = top;
    cachedHeight = height;
    cachedTopStart = tStart;
    cachedTopEnd = tEnd;
    cachedStart = bStart;
    cachedEnd = bEnd;
    cachedProgressStep = progressStep;

    boolean hasTop = (tEnd - tStart) > 0.005f;
    boolean hasBottom = (bEnd - bStart) > 0.005f;

    int count = 0;
    if (hasTop) {
      posScratch[count] = 0f;
      colorScratch[count++] = lerpAlphaColor(0x00, progress);
      if (tStart > 0.002f) {
        posScratch[count] = tStart;
        colorScratch[count++] = lerpAlphaColor(0x00, progress);
      }
      float tSpan = tEnd - tStart;
      posScratch[count] = tStart + tSpan * 0.12f;
      colorScratch[count++] = lerpAlphaColor(0x06, progress);
      posScratch[count] = tStart + tSpan * 0.24f;
      colorScratch[count++] = lerpAlphaColor(0x18, progress);
      posScratch[count] = tStart + tSpan * 0.38f;
      colorScratch[count++] = lerpAlphaColor(0x3E, progress);
      posScratch[count] = tStart + tSpan * 0.52f;
      colorScratch[count++] = lerpAlphaColor(0x76, progress);
      posScratch[count] = tStart + tSpan * 0.67f;
      colorScratch[count++] = lerpAlphaColor(0xB4, progress);
      posScratch[count] = tStart + tSpan * 0.83f;
      colorScratch[count++] = lerpAlphaColor(0xE6, progress);
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
      posScratch[count] = bStart + bSpan * 0.17f;
      colorScratch[count++] = lerpAlphaColor(0xE6, progress);
      posScratch[count] = bStart + bSpan * 0.33f;
      colorScratch[count++] = lerpAlphaColor(0xB4, progress);
      posScratch[count] = bStart + bSpan * 0.48f;
      colorScratch[count++] = lerpAlphaColor(0x76, progress);
      posScratch[count] = bStart + bSpan * 0.62f;
      colorScratch[count++] = lerpAlphaColor(0x3E, progress);
      posScratch[count] = bStart + bSpan * 0.76f;
      colorScratch[count++] = lerpAlphaColor(0x18, progress);
      posScratch[count] = bStart + bSpan * 0.88f;
      colorScratch[count++] = lerpAlphaColor(0x06, progress);
      posScratch[count] = bEnd;
      colorScratch[count++] = lerpAlphaColor(0x00, progress);
      if (bEnd < 0.999f) {
        posScratch[count] = 1f;
        colorScratch[count++] = lerpAlphaColor(0x00, progress);
      }
    } else {
      posScratch[count] = 1f;
      colorScratch[count++] = 0xFFFFFFFF;
    }

    float[] positions = new float[count];
    int[] colors = new int[count];
    System.arraycopy(posScratch, 0, positions, 0, count);
    System.arraycopy(colorScratch, 0, colors, 0, count);

    float gradTop = hasTop && height > 6 ? (top + 2f) : top;
    float gradBottom = hasBottom && height > 6 ? (top + height - 2f) : (top + height);
    if (gradBottom <= gradTop + 1f) {
      gradTop = top;
      gradBottom = top + height;
    }
    maskPaint.setShader(new LinearGradient(0f, gradTop, 0f, gradBottom, colors, positions, Shader.TileMode.CLAMP));
  }

  @Override
  protected void onDraw(Canvas canvas) {
    int viewW = getWidth();
    int viewH = getHeight();
    if (viewW <= 0 || viewH <= 0) {
      super.onDraw(canvas);
      return;
    }

    boolean hasClip = getClipBounds(clipBoundsRect);
    int drawLeft = hasClip ? Math.max(0, clipBoundsRect.left) : 0;
    int drawTop = hasClip ? Math.max(0, clipBoundsRect.top) : 0;
    int drawRight = hasClip ? Math.min(viewW, clipBoundsRect.right) : viewW;
    int drawBottom = hasClip ? Math.min(viewH, clipBoundsRect.bottom) : viewH;
    int drawW = drawRight - drawLeft;
    int drawH = drawBottom - drawTop;
    if (drawW <= 0 || drawH <= 0) {
      super.onDraw(canvas);
      return;
    }

    boolean withinTransitionWindow = (SystemClock.uptimeMillis() - attachTimeMs) <= TRANSITION_WINDOW_MS;
    float transitionProgress = 1f;
    float cornerProgress = 1f;
    if (!transitionComplete && withinTransitionWindow) {
      if (hasClip && (drawW < viewW - 2 || drawH < viewH - 2)) {
        if (!hasAnimatedClip) {
          hasAnimatedClip = true;
          initialClipWidth = drawW;
          initialClipHeight = drawH;
        }
        int denomW = Math.max(1, viewW - initialClipWidth);
        int denomH = Math.max(1, viewH - initialClipHeight);
        float progW = (drawW - initialClipWidth) / (float) denomW;
        float progH = (drawH - initialClipHeight) / (float) denomH;
        float rawProgress = Math.max(0f, Math.min(1f, Math.min(progW, progH)));
        cornerProgress = rawProgress * rawProgress;
        transitionProgress = 1f - (1f - rawProgress) * (1f - rawProgress);
      } else if (hasAnimatedClip) {
        transitionComplete = true;
      }
    } else {
      transitionComplete = true;
    }

    boolean hasTop = (topFadeEnd - topFadeStart) > 0.005f;
    boolean hasBottom = (fadeEnd - fadeStart) > 0.005f;
    float cornerRadiusPx = startCornerRadiusPx * (1f - cornerProgress);
    boolean isFlightClip = !transitionComplete && hasClip && drawW > 4 && drawH > 4;
    float inset = isFlightClip ? 1f : 0f;
    float contentLeft = drawLeft + inset;
    float contentTop = drawTop + inset;
    float contentRight = drawRight - inset;
    float contentBottom = drawBottom - inset;

    if ((!hasTop && !hasBottom) || transitionProgress <= 0.001f) {
      if (cornerRadiusPx > 0.5f || isFlightClip) {
        int save = canvas.save();
        if (cornerRadiusPx > 0.5f) {
          clipPath.reset();
          clipRectF.set(contentLeft, contentTop, contentRight, contentBottom);
          clipPath.addRoundRect(clipRectF, cornerRadiusPx, cornerRadiusPx, Path.Direction.CW);
          canvas.clipPath(clipPath);
        } else {
          canvas.clipRect(contentLeft, contentTop, contentRight, contentBottom);
        }
        super.onDraw(canvas);
        canvas.restoreToCount(save);
      } else {
        super.onDraw(canvas);
      }
      return;
    }

    int shaderTop = transitionComplete ? 0 : Math.round(contentTop);
    int shaderHeight = transitionComplete ? viewH : Math.max(1, Math.round(contentBottom - contentTop));
    int layerLeft = transitionComplete ? 0 : drawLeft;
    int layerTop = transitionComplete ? 0 : drawTop;
    int layerRight = transitionComplete ? viewW : drawRight;
    int layerBottom = transitionComplete ? viewH : drawBottom;

    // Expand offscreen layer & DST_IN mask beyond content bounds and restore the
    // rounded/inset clip BEFORE applying DST_IN so anti-aliased clip edges never
    // leave c*(1-c)*I unfeathered bright fringe pixels along the border.
    int saveCount = canvas.saveLayer(
      layerLeft - 4f,
      layerTop - 4f,
      layerRight + 4f,
      layerBottom + 4f,
      null
    );
    if (cornerRadiusPx > 0.5f || isFlightClip) {
      int clipSave = canvas.save();
      if (cornerRadiusPx > 0.5f) {
        clipPath.reset();
        clipRectF.set(contentLeft, contentTop, contentRight, contentBottom);
        clipPath.addRoundRect(clipRectF, cornerRadiusPx, cornerRadiusPx, Path.Direction.CW);
        canvas.clipPath(clipPath);
      } else {
        canvas.clipRect(contentLeft, contentTop, contentRight, contentBottom);
      }
      super.onDraw(canvas);
      canvas.restoreToCount(clipSave);
    } else {
      super.onDraw(canvas);
    }
    ensureShader(shaderTop, shaderHeight, transitionProgress);
    canvas.drawRect(layerLeft - 4f, layerTop - 4f, layerRight + 4f, layerBottom + 4f, maskPaint);
    canvas.restoreToCount(saveCount);
  }
}
