/**
 * Lumora Studio Pro — Auto Enhance Engine
 * 
 * Analyzes an image's pixel data and calculates optimal adjustments
 * to improve exposure, contrast, white balance, vibrance, and clarity.
 * Works on the client side using canvas pixel analysis.
 */

import { EditParameters } from '../stores/editStore';

interface ImageAnalysis {
  meanLuminance: number;
  minLuminance: number;
  maxLuminance: number;
  stdDevLuminance: number;
  meanR: number;
  meanG: number;
  meanB: number;
  saturationMean: number;
  highPercentile: number; // 95th percentile luminance
  lowPercentile: number;  // 5th percentile luminance
  histogramR: number[];
  histogramG: number[];
  histogramB: number[];
  histogramL: number[];
  dynamicRange: number;
}

/**
 * Analyze image pixel data to determine current characteristics
 */
function analyzeImage(imageData: ImageData): ImageAnalysis {
  const data = imageData.data;
  const pixelCount = data.length / 4;
  
  let sumR = 0, sumG = 0, sumB = 0, sumL = 0;
  let minL = 1, maxL = 0;
  let sumSat = 0;
  const luminances: number[] = [];
  
  const histogramR = new Array(256).fill(0);
  const histogramG = new Array(256).fill(0);
  const histogramB = new Array(256).fill(0);
  const histogramL = new Array(256).fill(0);
  
  // Sample every n-th pixel for performance
  const step = Math.max(1, Math.floor(pixelCount / 50000));
  let sampledCount = 0;
  
  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    
    sumR += r;
    sumG += g;
    sumB += b;
    
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sumL += lum;
    luminances.push(lum);
    
    if (lum < minL) minL = lum;
    if (lum > maxL) maxL = lum;
    
    // Calculate saturation
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
    sumSat += sat;
    
    // Build histograms
    const ri = Math.min(255, Math.floor(r * 255));
    const gi = Math.min(255, Math.floor(g * 255));
    const bi = Math.min(255, Math.floor(b * 255));
    const li = Math.min(255, Math.floor(lum * 255));
    histogramR[ri]++;
    histogramG[gi]++;
    histogramB[bi]++;
    histogramL[li]++;
    
    sampledCount++;
  }
  
  const meanR = sumR / sampledCount;
  const meanG = sumG / sampledCount;
  const meanB = sumB / sampledCount;
  const meanLuminance = sumL / sampledCount;
  const saturationMean = sumSat / sampledCount;
  
  // Standard deviation
  let sumSqDiff = 0;
  for (const l of luminances) {
    sumSqDiff += (l - meanLuminance) * (l - meanLuminance);
  }
  const stdDevLuminance = Math.sqrt(sumSqDiff / sampledCount);
  
  // Percentiles
  luminances.sort((a, b) => a - b);
  const lowIdx = Math.floor(sampledCount * 0.05);
  const highIdx = Math.floor(sampledCount * 0.95);
  const lowPercentile = luminances[lowIdx] || 0;
  const highPercentile = luminances[highIdx] || 1;
  
  return {
    meanLuminance,
    minLuminance: minL,
    maxLuminance: maxL,
    stdDevLuminance,
    meanR,
    meanG,
    meanB,
    saturationMean,
    highPercentile,
    lowPercentile,
    histogramR,
    histogramG,
    histogramB,
    histogramL,
    dynamicRange: highPercentile - lowPercentile,
  };
}

/**
 * Calculate auto-enhance adjustments based on image analysis.
 * Returns partial edit parameters that should be applied.
 */
export function calculateAutoEnhance(imageData: ImageData): Partial<EditParameters> {
  const analysis = analyzeImage(imageData);
  
  const adjustments: Partial<EditParameters> = {};
  
  // === Exposure Correction ===
  // Target mean luminance around 0.45 (slightly below middle for aesthetics)
  const targetLuminance = 0.45;
  const lumDiff = targetLuminance - analysis.meanLuminance;
  
  if (Math.abs(lumDiff) > 0.03) {
    // Convert luminance diff to exposure stops (roughly 0.5 stops per 0.1 luminance)
    adjustments.exposure = Math.max(-2, Math.min(2, lumDiff * 4));
    adjustments.exposure = Math.round(adjustments.exposure * 100) / 100;
  }
  
  // === Contrast ===
  // If dynamic range is low, boost contrast; if already high, reduce slightly
  const idealDynamicRange = 0.7;
  const rangeDiff = idealDynamicRange - analysis.dynamicRange;
  if (rangeDiff > 0.1) {
    adjustments.contrast = Math.round(Math.min(40, rangeDiff * 80));
  } else if (rangeDiff < -0.15) {
    adjustments.contrast = Math.round(Math.max(-15, rangeDiff * 30));
  }
  
  // === Highlights & Shadows ===
  // Recover highlights if they're clipped
  if (analysis.highPercentile > 0.92) {
    adjustments.highlights = Math.round(Math.max(-60, -(analysis.highPercentile - 0.85) * 200));
  }
  
  // Open up shadows if they're crushed
  if (analysis.lowPercentile < 0.08) {
    adjustments.shadows = Math.round(Math.min(50, (0.1 - analysis.lowPercentile) * 300));
  }
  
  // === Whites & Blacks ===
  // Extend range for punch
  if (analysis.maxLuminance < 0.9) {
    adjustments.whites = Math.round(Math.min(30, (0.95 - analysis.maxLuminance) * 100));
  }
  if (analysis.minLuminance > 0.1) {
    adjustments.blacks = Math.round(Math.max(-25, (0.05 - analysis.minLuminance) * 100));
  }
  
  // === White Balance (Temperature/Tint) ===
  // Analyze color cast - if R/G/B channels differ significantly from neutral
  const avgChannel = (analysis.meanR + analysis.meanG + analysis.meanB) / 3;
  
  // Warm/cool cast detection
  const warmCast = (analysis.meanR - analysis.meanB) / avgChannel;
  if (Math.abs(warmCast) > 0.05) {
    // Counteract cast: if warm, shift cool and vice versa
    adjustments.temperature = Math.round(Math.max(-600, Math.min(600, -warmCast * 1200)));
  }
  
  // Green/magenta cast detection
  const greenCast = (analysis.meanG - (analysis.meanR + analysis.meanB) / 2) / avgChannel;
  if (Math.abs(greenCast) > 0.03) {
    adjustments.tint = Math.round(Math.max(-50, Math.min(50, -greenCast * 200)));
  }
  
  // === Vibrance ===
  // Boost if image is undersaturated
  if (analysis.saturationMean < 0.25) {
    adjustments.vibrance = Math.round(Math.min(35, (0.3 - analysis.saturationMean) * 150));
  } else if (analysis.saturationMean > 0.6) {
    adjustments.vibrance = Math.round(Math.max(-15, -(analysis.saturationMean - 0.5) * 50));
  }
  
  // === Clarity ===
  // Add a touch of clarity for sharpness
  if (analysis.stdDevLuminance < 0.2) {
    adjustments.clarity = Math.min(20, Math.round((0.22 - analysis.stdDevLuminance) * 100));
  }
  
  // === Dehaze ===
  // If image appears hazy (low contrast + low saturation)
  if (analysis.dynamicRange < 0.5 && analysis.saturationMean < 0.2) {
    adjustments.dehaze = Math.round(Math.min(25, (0.55 - analysis.dynamicRange) * 50));
  }
  
  return adjustments;
}

/**
 * Analyze an image from a canvas element and return auto-enhance params.
 */
export function autoEnhanceFromCanvas(canvas: HTMLCanvasElement): Partial<EditParameters> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return {};
  
  // Sample a smaller area for performance
  const maxDim = 500;
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  const w = Math.floor(canvas.width * scale);
  const h = Math.floor(canvas.height * scale);
  
  // Create a smaller canvas for sampling
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return {};
  
  tempCtx.drawImage(canvas, 0, 0, w, h);
  const imageData = tempCtx.getImageData(0, 0, w, h);
  
  return calculateAutoEnhance(imageData);
}

/**
 * Analyze an image element and return auto-enhance params.
 */
export function autoEnhanceFromImage(img: HTMLImageElement): Partial<EditParameters> {
  const canvas = document.createElement('canvas');
  const maxDim = 500;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.floor(img.naturalWidth * scale);
  canvas.height = Math.floor(img.naturalHeight * scale);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return {};
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  return calculateAutoEnhance(imageData);
}

/**
 * Get the histogram data from real image pixel analysis
 */
export function getHistogramData(img: HTMLImageElement | HTMLCanvasElement): {
  r: number[];
  g: number[];
  b: number[];
  l: number[];
} {
  const canvas = document.createElement('canvas');
  const maxDim = 400;
  
  let w: number, h: number;
  if (img instanceof HTMLImageElement) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    w = Math.floor(img.naturalWidth * scale);
    h = Math.floor(img.naturalHeight * scale);
  } else {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    w = Math.floor(img.width * scale);
    h = Math.floor(img.height * scale);
  }
  
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: [], g: [], b: [], l: [] };
  
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  
  const histR = new Array(256).fill(0);
  const histG = new Array(256).fill(0);
  const histB = new Array(256).fill(0);
  const histL = new Array(256).fill(0);
  
  for (let i = 0; i < data.length; i += 4) {
    histR[data[i]]++;
    histG[data[i + 1]]++;
    histB[data[i + 2]]++;
    const l = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    histL[Math.min(255, l)]++;
  }
  
  // Normalize
  const maxVal = Math.max(
    ...histR.slice(5, 250),
    ...histG.slice(5, 250),
    ...histB.slice(5, 250),
  );
  
  return {
    r: histR.map((v) => v / maxVal),
    g: histG.map((v) => v / maxVal),
    b: histB.map((v) => v / maxVal),
    l: histL.map((v) => v / maxVal),
  };
}
