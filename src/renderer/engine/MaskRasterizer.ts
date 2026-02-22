/**
 * Lumora Studio Pro — Mask Rasterizer
 * 
 * Converts mask definitions (brush strokes, gradients, luminosity ranges)
 * into alpha-channel canvases for GPU compositing.
 * White (255) = fully masked, Black (0) = unmasked.
 */

import type { Mask, BrushStroke, LinearGradientData, RadialGradientData, LuminosityData } from '../stores/maskStore';

export class MaskRasterizer {
  /**
   * Rasterize a mask to a canvas.
   * Returns an HTMLCanvasElement where red channel = mask alpha.
   * @param mask The mask definition
   * @param width Canvas width in pixels
   * @param height Canvas height in pixels
   * @param imageWidth Original image width (for coordinate mapping)
   * @param imageHeight Original image height (for coordinate mapping)
   */
  static rasterize(
    mask: Mask,
    width: number,
    height: number,
    imageWidth: number,
    imageHeight: number,
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Clear to black (no mask)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    switch (mask.type) {
      case 'brush':
        this.rasterizeBrush(ctx, mask.brushStrokes || [], width, height, imageWidth, imageHeight);
        break;
      case 'linearGradient':
        if (mask.linearGradient) {
          this.rasterizeLinearGradient(ctx, mask.linearGradient, width, height);
        }
        break;
      case 'radialGradient':
        if (mask.radialGradient) {
          this.rasterizeRadialGradient(ctx, mask.radialGradient, width, height);
        }
        break;
      case 'luminosity':
        if (mask.luminosity) {
          this.rasterizeLuminosity(ctx, mask.luminosity, width, height);
        }
        break;
    }

    // Apply mask opacity
    if (mask.opacity < 100) {
      ctx.globalCompositeOperation = 'destination-in';
      const alpha = mask.opacity / 100;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }

    return canvas;
  }

  /**
   * Rasterize a luminosity mask from source image data.
   * This needs the actual rendered image to compute brightness-based masks.
   */
  static rasterizeLuminosityFromImage(
    mask: Mask,
    sourceCanvas: HTMLCanvasElement,
    width: number,
    height: number,
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    if (!mask.luminosity) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
      return canvas;
    }

    // Get source pixel data
    const srcCtx = document.createElement('canvas').getContext('2d')!;
    srcCtx.canvas.width = width;
    srcCtx.canvas.height = height;
    srcCtx.drawImage(sourceCanvas, 0, 0, width, height);
    const srcData = srcCtx.getImageData(0, 0, width, height);
    const pixels = srcData.data;

    const { range, threshold, feather } = mask.luminosity;
    const t = threshold / 100;
    const f = Math.max(feather / 100, 0.01);

    const outData = ctx.createImageData(width, height);
    const out = outData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      // Compute luminance (Rec. 709)
      const lum = (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;

      let alpha = 0;
      switch (range) {
        case 'highlights': {
          const edge = t;
          alpha = smoothstep(edge - f, edge + f, lum);
          break;
        }
        case 'shadows': {
          const edge = 1 - t;
          alpha = 1 - smoothstep(edge - f, edge + f, lum);
          break;
        }
        case 'midtones': {
          const low = 0.5 - t * 0.5;
          const high = 0.5 + t * 0.5;
          const a1 = smoothstep(low - f, low + f, lum);
          const a2 = 1 - smoothstep(high - f, high + f, lum);
          alpha = a1 * a2;
          break;
        }
      }

      const val = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
      out[i] = val;
      out[i + 1] = val;
      out[i + 2] = val;
      out[i + 3] = 255;
    }

    ctx.putImageData(outData, 0, 0);

    // Apply opacity
    if (mask.opacity < 100) {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(255, 255, 255, ${mask.opacity / 100})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }

    return canvas;
  }

  /** Rasterize brush strokes to canvas */
  private static rasterizeBrush(
    ctx: CanvasRenderingContext2D,
    strokes: BrushStroke[],
    width: number,
    height: number,
    imageWidth: number,
    imageHeight: number,
  ): void {
    if (strokes.length === 0) return;

    const scaleX = width / Math.max(imageWidth, 1);
    const scaleY = height / Math.max(imageHeight, 1);

    for (const stroke of strokes) {
      if (stroke.points.length < 1) continue;

      const isErase = stroke.erase;
      const radius = (stroke.size / 2) * scaleX;
      const featherRatio = Math.max(0, Math.min(1, (stroke.feather ?? 50) / 100));
      const flow = (stroke.flow ?? 100) / 100;

      // For erase strokes, cut out from existing mask
      if (isErase) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'lighter';
      }

      for (let i = 0; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        const x = pt.x * scaleX;
        const y = pt.y * scaleY;
        const pressure = (pt.pressure ?? 1) * flow;
        const alphaVal = Math.min(1, Math.max(0, pressure));
        const byteVal = Math.round(alphaVal * 255);

        // Create a soft radial brush stamp
        const innerRadius = radius * (1 - featherRatio);
        const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);

        if (isErase) {
          gradient.addColorStop(0, `rgba(255, 255, 255, ${alphaVal})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
          gradient.addColorStop(0, `rgb(${byteVal}, ${byteVal}, ${byteVal})`);
          gradient.addColorStop(1, 'rgb(0, 0, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  /** Rasterize a linear gradient mask */
  private static rasterizeLinearGradient(
    ctx: CanvasRenderingContext2D,
    data: LinearGradientData,
    width: number,
    height: number,
  ): void {
    const x0 = data.startX * width;
    const y0 = data.startY * height;
    const x1 = data.endX * width;
    const y1 = data.endY * height;

    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'black');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /** Rasterize a radial gradient mask */
  private static rasterizeRadialGradient(
    ctx: CanvasRenderingContext2D,
    data: RadialGradientData,
    width: number,
    height: number,
  ): void {
    const cx = data.centerX * width;
    const cy = data.centerY * height;
    const rx = data.radiusX * width;
    const ry = data.radiusY * height;
    const r = Math.max(rx, ry);
    const featherAmt = Math.max(0.01, data.feather / 100);

    // Build radial gradient
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

    if (data.invert) {
      // Inverted: outside is selected (white), inside is unselected (black)
      gradient.addColorStop(0, 'black');
      gradient.addColorStop(Math.max(0, 1 - featherAmt), 'black');
      gradient.addColorStop(1, 'white');
    } else {
      // Normal: inside is selected (white), outside is unselected (black)
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(Math.max(0, 1 - featherAmt), 'white');
      gradient.addColorStop(1, 'black');
    }

    // Handle elliptical shape
    ctx.save();
    if (rx !== ry && rx > 0 && ry > 0) {
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      ctx.translate(-cx, -cy);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /** Rasterize a luminosity mask (without source image — generates brightness ramp) */
  private static rasterizeLuminosity(
    ctx: CanvasRenderingContext2D,
    data: LuminosityData,
    width: number,
    height: number,
  ): void {
    // Without access to the actual image, generate a flat mask
    // The real luminosity mask is computed via rasterizeLuminosityFromImage()
    // This creates a placeholder based on the range selection
    const t = data.threshold / 100;
    const f = data.feather / 100;

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    switch (data.range) {
      case 'highlights':
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(Math.max(0, t - f), 'black');
        gradient.addColorStop(Math.min(1, t + f), 'white');
        gradient.addColorStop(1, 'white');
        break;
      case 'shadows':
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(Math.max(0, 1 - t - f), 'white');
        gradient.addColorStop(Math.min(1, 1 - t + f), 'black');
        gradient.addColorStop(1, 'black');
        break;
      case 'midtones':
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(0.3, 'white');
        gradient.addColorStop(0.7, 'white');
        gradient.addColorStop(1, 'black');
        break;
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

/** GLSL-like smoothstep helper */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
