package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import android.view.View;

import androidx.annotation.Nullable;

import java.util.Arrays;

/**
 * Hardware-accelerated vertical linear gradient overlay view.
 */
public class LinearGradientView extends View {
  private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.DITHER_FLAG);
  private int[] colors = new int[] { 0x00000000, 0x00000000 };
  @Nullable
  private float[] locations = null;
  private int cachedHeight = -1;
  private int[] cachedColors = null;
  private float[] cachedLocations = null;

  public LinearGradientView(Context context) {
    super(context);
  }

  public void setColors(@Nullable int[] colors) {
    int[] nextColors = (colors == null || colors.length < 2)
      ? new int[] { 0x00000000, 0x00000000 }
      : colors;
    if (Arrays.equals(this.colors, nextColors)) return;
    this.colors = nextColors;
    cachedHeight = -1;
    invalidate();
  }

  public void setLocations(@Nullable float[] locations) {
    if (Arrays.equals(this.locations, locations)) return;
    this.locations = locations;
    cachedHeight = -1;
    invalidate();
  }

  private void ensureShader(int height) {
    if (cachedHeight == height && Arrays.equals(cachedColors, colors) && Arrays.equals(cachedLocations, locations)) {
      return;
    }
    cachedHeight = height;
    cachedColors = colors.clone();
    cachedLocations = locations != null ? locations.clone() : null;

    float[] locs = (locations != null && locations.length == colors.length) ? locations : null;
    paint.setShader(new LinearGradient(0f, 0f, 0f, height, colors, locs, Shader.TileMode.CLAMP));
  }

  @Override
  protected void onDraw(Canvas canvas) {
    int width = getWidth();
    int height = getHeight();
    if (width <= 0 || height <= 0 || colors.length < 2) return;

    ensureShader(height);
    canvas.drawRect(0f, 0f, width, height, paint);
  }
}
