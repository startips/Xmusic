package cn.toside.music.mobile.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.view.View;

/**
 * Crisp filled Material heart vector view tinted with any theme color.
 */
public class SolidHeartView extends View {
  private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Path unitPath = new Path();
  private final Path scaledPath = new Path();
  private final Matrix matrix = new Matrix();
  private int cachedW = -1;
  private int cachedH = -1;

  public SolidHeartView(Context context) {
    super(context);
    paint.setStyle(Paint.Style.FILL);
    paint.setColor(0xFF4DAF7C);

    // Standard Material Design 24x24 solid heart geometry.
    unitPath.moveTo(12f, 21.35f);
    unitPath.lineTo(10.55f, 20.03f);
    unitPath.cubicTo(5.4f, 15.36f, 2f, 12.28f, 2f, 8.5f);
    unitPath.cubicTo(2f, 5.42f, 4.42f, 3f, 7.5f, 3f);
    unitPath.cubicTo(9.24f, 3f, 10.91f, 3.81f, 12f, 5.09f);
    unitPath.cubicTo(13.09f, 3.81f, 14.76f, 3f, 16.5f, 3f);
    unitPath.cubicTo(19.58f, 3f, 22f, 5.42f, 22f, 8.5f);
    unitPath.cubicTo(22f, 12.28f, 18.6f, 15.36f, 13.45f, 20.04f);
    unitPath.close();
  }

  public void setHeartColor(int color) {
    if (paint.getColor() != color) {
      paint.setColor(color);
      invalidate();
    }
  }

  private void ensurePath(int w, int h) {
    if (cachedW == w && cachedH == h) return;
    cachedW = w;
    cachedH = h;
    float side = Math.min(w, h);
    float scale = side / 24f;
    float dx = (w - side) * 0.5f;
    float dy = (h - side) * 0.5f;
    matrix.reset();
    matrix.setScale(scale, scale);
    matrix.postTranslate(dx, dy);
    unitPath.transform(matrix, scaledPath);
  }

  @Override
  protected void onDraw(Canvas canvas) {
    int w = getWidth();
    int h = getHeight();
    if (w <= 0 || h <= 0) return;

    ensurePath(w, h);
    canvas.drawPath(scaledPath, paint);
  }
}
