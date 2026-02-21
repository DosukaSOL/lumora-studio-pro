/**
 * Lumora Studio Pro — Image Processor
 * 
 * Handles all server-side image operations using Sharp.
 * Supports RAW formats, thumbnail generation, and export.
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import exifr from 'exifr';

export class ImageProcessor {
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'cache');
    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.mkdir(path.join(this.cacheDir, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.cacheDir, 'previews'), { recursive: true });
    } catch (e) {
      // Directory already exists
    }
  }

  /**
   * Get comprehensive image information including EXIF data
   */
  async getImageInfo(filePath: string): Promise<any> {
    const stat = await fs.stat(filePath);
    let metadata: any = {};
    let exifData: any = {};

    try {
      metadata = await sharp(filePath).metadata();
    } catch (e) {
      console.warn('Could not read image metadata:', e);
    }

    try {
      exifData = await exifr.parse(filePath, {
        pick: [
          'Make', 'Model', 'LensModel', 'FocalLength', 'FNumber',
          'ExposureTime', 'ISO', 'DateTimeOriginal',
          'GPSLatitude', 'GPSLongitude', 'ImageWidth', 'ImageHeight',
          'WhiteBalance', 'Flash', 'MeteringMode', 'ExposureProgram',
        ],
      }) || {};
    } catch (e) {
      // EXIF parsing may fail for some formats
    }

    return {
      width: metadata.width || exifData?.ImageWidth || 0,
      height: metadata.height || exifData?.ImageHeight || 0,
      format: metadata.format || path.extname(filePath).replace('.', ''),
      size: stat.size,
      channels: metadata.channels,
      space: metadata.space,
      hasAlpha: metadata.hasAlpha,
      density: metadata.density,
      dateTaken: exifData?.DateTimeOriginal?.toISOString?.() || null,
      cameraMake: exifData?.Make || null,
      cameraModel: exifData?.Model || null,
      lens: exifData?.LensModel || null,
      focalLength: exifData?.FocalLength || null,
      aperture: exifData?.FNumber || null,
      shutterSpeed: exifData?.ExposureTime ? `1/${Math.round(1 / exifData.ExposureTime)}` : null,
      iso: exifData?.ISO || null,
      gpsLat: exifData?.GPSLatitude || null,
      gpsLng: exifData?.GPSLongitude || null,
      whiteBalance: exifData?.WhiteBalance || null,
      flash: exifData?.Flash || null,
    };
  }

  /**
   * Generate a thumbnail for the image
   */
  async generateThumbnail(filePath: string, size: number = 300): Promise<string> {
    const hash = Buffer.from(filePath).toString('base64url').substring(0, 32);
    const thumbnailPath = path.join(this.cacheDir, 'thumbnails', `${hash}_${size}.jpg`);

    try {
      await fs.access(thumbnailPath);
      return thumbnailPath; // Already cached
    } catch {
      // Generate new thumbnail
    }

    try {
      await sharp(filePath)
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbnailPath);
      return thumbnailPath;
    } catch (e) {
      console.error('Thumbnail generation failed:', e);
      return '';
    }
  }

  /**
   * Process an image with the given edit operations
   * Returns a base64-encoded preview
   */
  async processImage(filePath: string, operations: any): Promise<string> {
    try {
      let pipeline = sharp(filePath);

      // Apply resize if specified
      if (operations.resize) {
        pipeline = pipeline.resize(operations.resize.width, operations.resize.height, {
          fit: operations.resize.fit || 'inside',
        });
      }

      // Apply rotation
      if (operations.rotate) {
        pipeline = pipeline.rotate(operations.rotate);
      }

      // Apply flip/flop
      if (operations.flip) pipeline = pipeline.flip();
      if (operations.flop) pipeline = pipeline.flop();

      // Apply basic adjustments via Sharp's modulate
      if (operations.brightness || operations.saturation || operations.hue) {
        pipeline = pipeline.modulate({
          brightness: operations.brightness ? 1 + operations.brightness / 100 : undefined,
          saturation: operations.saturation ? 1 + operations.saturation / 100 : undefined,
          hue: operations.hue || undefined,
        });
      }

      // Apply sharpening
      if (operations.sharpen) {
        pipeline = pipeline.sharpen({
          sigma: operations.sharpen.radius || 1,
          m1: operations.sharpen.amount || 1,
          m2: operations.sharpen.threshold || 2,
        } as any);
      }

      // Apply blur (for noise reduction simulation)
      if (operations.blur && operations.blur > 0) {
        pipeline = pipeline.blur(operations.blur);
      }

      // Apply gamma for tone adjustments
      if (operations.gamma) {
        pipeline = pipeline.gamma(operations.gamma);
      }

      // Normalize (auto levels)
      if (operations.normalize) {
        pipeline = pipeline.normalize();
      }

      // Generate preview buffer
      const buffer = await pipeline
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.error('Image processing failed:', e);
      throw e;
    }
  }

  /**
   * Export an image with all applied edits
   */
  async exportImage(options: {
    sourcePath: string;
    outputPath: string;
    format: 'jpeg' | 'png' | 'tiff';
    quality: number;
    width?: number;
    height?: number;
    resizePercent?: number;
    operations?: any;
    watermark?: { text: string; position: string; opacity: number };
  }): Promise<string> {
    let pipeline = sharp(options.sourcePath);

    // Apply operations
    if (options.operations) {
      if (options.operations.brightness || options.operations.saturation) {
        pipeline = pipeline.modulate({
          brightness: options.operations.brightness ? 1 + options.operations.brightness / 100 : undefined,
          saturation: options.operations.saturation ? 1 + options.operations.saturation / 100 : undefined,
        });
      }
      if (options.operations.sharpen) {
        pipeline = pipeline.sharpen();
      }
    }

    // Apply resize
    if (options.resizePercent) {
      const metadata = await sharp(options.sourcePath).metadata();
      const w = Math.round((metadata.width || 1000) * options.resizePercent / 100);
      const h = Math.round((metadata.height || 1000) * options.resizePercent / 100);
      pipeline = pipeline.resize(w, h);
    } else if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, { fit: 'inside' });
    }

    // Apply watermark
    if (options.watermark?.text) {
      const metadata = await sharp(options.sourcePath).metadata();
      const svgText = `
        <svg width="${metadata.width}" height="${metadata.height}">
          <style>
            .watermark { 
              fill: rgba(255,255,255,${options.watermark.opacity / 100}); 
              font-size: ${Math.max(20, (metadata.width || 1000) / 30)}px; 
              font-family: Arial, sans-serif;
            }
          </style>
          <text x="50%" y="95%" text-anchor="middle" class="watermark">${options.watermark.text}</text>
        </svg>
      `;
      pipeline = pipeline.composite([{ input: Buffer.from(svgText), gravity: 'south' }]);
    }

    // Set output format
    switch (options.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options.quality || 90 });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: Math.round((100 - (options.quality || 90)) / 11) });
        break;
      case 'tiff':
        pipeline = pipeline.tiff({ quality: options.quality || 90 });
        break;
    }

    await pipeline.toFile(options.outputPath);
    return options.outputPath;
  }
}
