/**
 * Lumora Studio Pro — Image Processor
 * 
 * Handles all server-side image operations using Sharp.
 * Supports RAW formats via EXIF thumbnail extraction and macOS sips.
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { app, nativeImage } from 'electron';
import exifr from 'exifr';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** RAW file extensions that need special handling */
const RAW_EXTENSIONS = new Set([
  '.arw', '.cr2', '.cr3', '.nef', '.orf', '.rw2', '.raf', '.dng', '.pef',
  '.srw', '.x3f', '.3fr', '.mef', '.mrw', '.nrw', '.raw', '.rwl', '.sr2',
]);

export class ImageProcessor {
  private cacheDir: string;

  private cacheDirReady: Promise<void>;

  constructor() {
    // Use 'lumora-cache' to avoid collision with Electron's internal 'cache' directory
    this.cacheDir = path.join(app.getPath('userData'), 'lumora-cache');
    this.cacheDirReady = this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(path.join(this.cacheDir, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.cacheDir, 'previews'), { recursive: true });
      console.log('[Cache] Directories ready');
    } catch (e) {
      console.error('[Cache] Failed to create cache directories:', e);
    }
  }

  /** Check if a file is a RAW camera format */
  private isRawFile(filePath: string): boolean {
    return RAW_EXTENSIONS.has(path.extname(filePath).toLowerCase());
  }

  /**
   * Extract embedded JPEG preview from a RAW file via EXIF data.
   * Most camera RAW files contain a JPEG thumbnail in the EXIF.
   */
  private async extractExifThumbnail(filePath: string): Promise<Buffer | null> {
    try {
      const thumb = await exifr.thumbnail(filePath);
      if (thumb && thumb.length > 100) {
        console.log(`[RAW] Extracted EXIF thumbnail (${thumb.length} bytes) from ${path.basename(filePath)}`);
        return Buffer.from(thumb);
      }
    } catch (e) {
      console.warn(`[RAW] EXIF thumbnail extraction failed for ${path.basename(filePath)}:`, e);
    }
    return null;
  }

  /**
   * Convert a RAW file to JPEG using macOS sips command.
   * This uses Apple's native ImageIO framework which supports all RAW formats.
   */
  private async convertRawWithSips(filePath: string, outputPath: string, maxSize: number): Promise<boolean> {
    if (process.platform !== 'darwin') return false;
    await this.cacheDirReady; // Ensure output directory exists

    try {
      await execFileAsync('/usr/bin/sips', [
        '-s', 'format', 'jpeg',
        '-s', 'formatOptions', '90',
        '-Z', String(maxSize),
        filePath,
        '--out', outputPath,
      ], { timeout: 30000 });
      // Verify the output exists and has content
      const stat = await fs.stat(outputPath);
      if (stat.size > 100) {
        console.log(`[RAW] Converted via sips (${stat.size} bytes): ${path.basename(filePath)}`);
        return true;
      }
    } catch (e) {
      console.warn(`[RAW] sips conversion failed for ${path.basename(filePath)}:`, e);
    }
    return false;
  }

  /**
   * Get comprehensive image information including EXIF data
   */
  async getImageInfo(filePath: string): Promise<any> {
    console.log(`[ImageInfo] Reading: ${path.basename(filePath)}`);
    const stat = await fs.stat(filePath);
    let metadata: any = {};
    let exifData: any = {};

    // Try nativeImage first for dimensions (most reliable on macOS)
    try {
      const native = nativeImage.createFromPath(filePath);
      if (!native.isEmpty()) {
        const size = native.getSize();
        metadata = { width: size.width, height: size.height };
        console.log(`[ImageInfo] nativeImage dimensions: ${size.width}x${size.height}`);
      }
    } catch {
      // nativeImage failed
    }

    // Try Sharp for richer metadata (channels, color space, etc.)
    if (!metadata.width) {
      try {
        metadata = await sharp(filePath).metadata();
        console.log(`[ImageInfo] Sharp metadata: ${metadata.width}x${metadata.height} ${metadata.format}`);
      } catch (e) {
        console.warn(`[ImageInfo] Sharp metadata failed:`, e);
      }
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
   * Generate a thumbnail for the image.
   * Tries nativeImage first (most reliable on macOS), then Sharp as fallback.
   */
  async generateThumbnail(filePath: string, size: number = 300): Promise<string> {
    await this.cacheDirReady; // Ensure cache directories exist
    const hash = Buffer.from(filePath).toString('base64url').substring(0, 32);
    const thumbnailPath = path.join(this.cacheDir, 'thumbnails', `${hash}_${size}.jpg`);

    try {
      await fs.access(thumbnailPath);
      console.log(`[Thumb] Cache hit: ${path.basename(filePath)}`);
      return thumbnailPath; // Already cached
    } catch {
      // Generate new thumbnail
    }

    // Try nativeImage first — most reliable on macOS (handles JPEG, PNG, HEIC, TIFF, BMP, GIF)
    try {
      const native = nativeImage.createFromPath(filePath);
      if (!native.isEmpty()) {
        const nativeSize = native.getSize();
        const scale = Math.min(size / nativeSize.width, size / nativeSize.height, 1);
        const resizeOpts = nativeSize.width >= nativeSize.height
          ? { width: Math.round(nativeSize.width * scale) }
          : { height: Math.round(nativeSize.height * scale) };
        const resized = native.resize(resizeOpts);
        const jpegBuffer = resized.toJPEG(85);
        await fs.writeFile(thumbnailPath, jpegBuffer);
        console.log(`[Thumb] Generated via nativeImage: ${path.basename(filePath)}`);
        return thumbnailPath;
      }
    } catch (e) {
      console.warn(`[Thumb] nativeImage failed for ${path.basename(filePath)}:`, e);
    }

    // Fallback: Sharp (handles additional formats like SVG, WebP animations)
    try {
      await sharp(filePath)
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbnailPath);
      console.log(`[Thumb] Generated via Sharp: ${path.basename(filePath)}`);
      return thumbnailPath;
    } catch (e) {
      console.warn(`[Thumb] Sharp failed for ${path.basename(filePath)}:`, e);
    }

    // RAW file fallbacks: extract embedded JPEG or convert with sips
    if (this.isRawFile(filePath)) {
      // Try extracting EXIF thumbnail and resizing it
      const exifThumb = await this.extractExifThumbnail(filePath);
      if (exifThumb) {
        try {
          await sharp(exifThumb)
            .resize(size, size, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);
          console.log(`[Thumb] Generated from EXIF thumbnail: ${path.basename(filePath)}`);
          return thumbnailPath;
        } catch (e) {
          console.warn(`[Thumb] EXIF thumbnail resize failed:`, e);
          // Even if Sharp resize fails, write the raw EXIF thumbnail
          try {
            await fs.writeFile(thumbnailPath, exifThumb);
            return thumbnailPath;
          } catch {}
        }
      }

      // Last resort for RAW: use macOS sips to convert
      if (await this.convertRawWithSips(filePath, thumbnailPath, size)) {
        return thumbnailPath;
      }
    }

    console.error(`[Thumb] All methods failed for: ${filePath}`);
    return '';
  }

  /**
   * Load image as base64 data URI for the renderer.
   * Uses nativeImage first, then Sharp, then RAW-specific fallbacks (sips/EXIF).
   * For RAW files requesting large sizes, prefers sips (full-res) over EXIF (tiny thumbnail).
   */
  async loadImageAsBase64(filePath: string, maxSize: number = 2048): Promise<string> {
    const basename = path.basename(filePath);
    console.log(`[LoadBase64] Loading ${basename} at maxSize=${maxSize}`);

    // Try nativeImage first — most reliable on macOS for common formats
    try {
      const native = nativeImage.createFromPath(filePath);
      if (!native.isEmpty()) {
        const nativeSize = native.getSize();
        const scale = Math.min(maxSize / nativeSize.width, maxSize / nativeSize.height, 1);
        let resized = native;
        if (scale < 1) {
          const resizeOpts = nativeSize.width >= nativeSize.height
            ? { width: Math.round(nativeSize.width * scale) }
            : { height: Math.round(nativeSize.height * scale) };
          resized = native.resize(resizeOpts);
        }
        const jpegBuffer = resized.toJPEG(92);
        console.log(`[LoadBase64] OK via nativeImage (${jpegBuffer.length} bytes) for ${basename}`);
        return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn(`[LoadBase64] nativeImage failed for ${basename}:`, e);
    }

    // Fallback: Sharp (handles additional formats)
    try {
      const buffer = await sharp(filePath)
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 92 })
        .toBuffer();
      console.log(`[LoadBase64] OK via Sharp (${buffer.length} bytes) for ${basename}`);
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.warn(`[LoadBase64] Sharp failed for ${basename}`);
    }

    // RAW file fallbacks
    if (this.isRawFile(filePath)) {
      await this.cacheDirReady;
      const hash = Buffer.from(filePath).toString('base64url').substring(0, 32);

      // For larger sizes, prefer sips (produces full-quality JPEG from RAW sensor data)
      if (maxSize > 500) {
        const cachedPreview = path.join(this.cacheDir, 'previews', `${hash}_${maxSize}.jpg`);

        // Check cache first
        try {
          const cachedData = await fs.readFile(cachedPreview);
          if (cachedData.length > 100) {
            console.log(`[LoadBase64] OK via cached sips preview (${cachedData.length} bytes) for ${basename}`);
            return `data:image/jpeg;base64,${cachedData.toString('base64')}`;
          }
        } catch {
          // Not cached yet
        }

        // Generate via sips — full quality RAW conversion
        if (await this.convertRawWithSips(filePath, cachedPreview, maxSize)) {
          try {
            const data = await fs.readFile(cachedPreview);
            console.log(`[LoadBase64] OK via sips conversion (${data.length} bytes) for ${basename}`);
            return `data:image/jpeg;base64,${data.toString('base64')}`;
          } catch (e) {
            console.warn(`[LoadBase64] sips output read failed for ${basename}:`, e);
          }
        }
      }

      // For smaller sizes or if sips failed: use EXIF embedded thumbnail
      const exifThumb = await this.extractExifThumbnail(filePath);
      if (exifThumb) {
        try {
          const buffer = await sharp(exifThumb)
            .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 92 })
            .toBuffer();
          console.log(`[LoadBase64] OK via EXIF thumbnail (${buffer.length} bytes) for ${basename}`);
          return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        } catch {
          console.log(`[LoadBase64] OK via raw EXIF thumbnail (${exifThumb.length} bytes) for ${basename}`);
          return `data:image/jpeg;base64,${exifThumb.toString('base64')}`;
        }
      }

      // Last resort for RAW: sips at any size
      if (maxSize <= 500) {
        const tmpPath = path.join(this.cacheDir, 'previews', `${hash}_${maxSize}.jpg`);
        if (await this.convertRawWithSips(filePath, tmpPath, maxSize)) {
          try {
            const data = await fs.readFile(tmpPath);
            console.log(`[LoadBase64] OK via sips fallback (${data.length} bytes) for ${basename}`);
            return `data:image/jpeg;base64,${data.toString('base64')}`;
          } catch {}
        }
      }
    }

    // Last resort: read file directly (only works for browser-decodable formats like JPEG/PNG)
    try {
      const ext = path.extname(filePath).toLowerCase();
      if (!this.isRawFile(filePath)) {
        const data = await fs.readFile(filePath);
        const mime = ext === '.png' ? 'image/png' 
          : ext === '.webp' ? 'image/webp' 
          : ext === '.gif' ? 'image/gif'
          : 'image/jpeg';
        console.log(`[LoadBase64] OK via direct file read (${data.length} bytes) for ${basename}`);
        return `data:${mime};base64,${data.toString('base64')}`;
      }
    } catch {}

    console.error(`[LoadBase64] ALL methods failed for: ${filePath}`);
    return '';
  }

  /**
   * Read a file from disk and return as base64 data URI.
   * Used for reading cached thumbnails directly — no processing.
   */
  async readFileAsBase64(filePath: string): Promise<string> {
    const basename = path.basename(filePath);
    console.log(`[ReadBase64] Reading: ${path.basename(filePath)}`);
    try {
      // Check file exists and is readable
      const stat = await fs.stat(filePath);
      console.log(`[ReadBase64] File exists: ${basename} (${stat.size} bytes)`);

      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp',
        '.gif': 'image/gif', '.tiff': 'image/tiff', '.tif': 'image/tiff',
        '.bmp': 'image/bmp', '.svg': 'image/svg+xml',
        '.heic': 'image/heic', '.heif': 'image/heif',
      };
      const mime = mimeMap[ext] || 'image/jpeg';
      const result = `data:${mime};base64,${data.toString('base64')}`;
      console.log(`[ReadBase64] OK: ${basename} → ${result.length} chars data URI`);
      return result;
    } catch (e) {
      console.error(`[ReadBase64] FAILED for ${filePath}:`, e);
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
   * Export an image with all applied edits.
   * 
   * Two modes:
   *  1. canvasExport=true  — receives pre-rendered base64 PNG from WebGL canvas,
   *     converts to target format via Sharp (preserves all GPU edits).
   *  2. canvasExport=false — reads source file, applies basic Sharp operations,
   *     and writes to target format (limited edit support).
   */
  async exportImage(options: {
    sourcePath: string;
    outputPath: string;
    format: 'jpeg' | 'png' | 'tiff' | 'webp';
    quality: number;
    width?: number;
    height?: number;
    resizePercent?: number;
    operations?: any;
    watermark?: { text: string; position: string; opacity: number };
    canvasExport?: boolean;
    base64Data?: string;
  }): Promise<string> {
    let pipeline: sharp.Sharp;

    if (options.canvasExport && options.base64Data) {
      // Canvas export: base64 PNG → Sharp pipeline → target format
      const buf = Buffer.from(options.base64Data, 'base64');
      pipeline = sharp(buf);
    } else {
      pipeline = sharp(options.sourcePath);

      // Apply basic operations (server-side fallback)
      if (options.operations) {
        const ops = options.operations;
        const modOpts: any = {};
        if (ops.brightness) modOpts.brightness = 1 + ops.brightness / 100;
        if (ops.saturation) modOpts.saturation = 1 + ops.saturation / 100;
        if (Object.keys(modOpts).length > 0) {
          pipeline = pipeline.modulate(modOpts);
        }
        if (ops.sharpen) {
          pipeline = pipeline.sharpen();
        }
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
      const srcMeta = await (options.canvasExport && options.base64Data
        ? sharp(Buffer.from(options.base64Data, 'base64')).metadata()
        : sharp(options.sourcePath).metadata());
      const svgText = `
        <svg width="${srcMeta.width}" height="${srcMeta.height}">
          <style>
            .watermark { 
              fill: rgba(255,255,255,${options.watermark.opacity / 100}); 
              font-size: ${Math.max(20, (srcMeta.width || 1000) / 30)}px; 
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
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality || 90 });
        break;
    }

    await pipeline.toFile(options.outputPath);
    return options.outputPath;
  }
}
