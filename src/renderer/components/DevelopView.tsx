/**
 * Lumora Studio Pro — Develop View
 * 
 * Single image editing view with real-time preview,
 * before/after comparison, zoom controls, and
 * interactive mask painting / gradient manipulation.
 * 
 * RENDERING STRATEGY:
 *  - WebGL canvas is the sole display element (with preserveDrawingBuffer)
 *  - Opaque dark background via clearColor when no image loaded
 *  - All edit adjustments applied in real-time via GPU shaders
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { useEditStore } from '../stores/editStore';
import { useMaskStore } from '../stores/maskStore';
import { WebGLImageRenderer } from '../engine/WebGLRenderer';
import { MaskRasterizer } from '../engine/MaskRasterizer';

/** Global reference to the active WebGL renderer (used by ExportDialog) */
let activeRendererRef: WebGLImageRenderer | null = null;
let activeImageElementRef: HTMLImageElement | null = null;

export function getActiveRenderer(): WebGLImageRenderer | null { return activeRendererRef; }
export function getActiveImageElement(): HTMLImageElement | null { return activeImageElementRef; }

export const DevelopView: React.FC = () => {
  const { activeImageId, images, showBeforeAfter, zoomLevel, setZoomLevel } = useAppStore();
  const { edits } = useEditStore();
  const masks = useMaskStore((s) => s.masks);
  const activeMaskId = useMaskStore((s) => s.activeMaskId);
  const activeTool = useMaskStore((s) => s.activeTool);
  const showMaskOverlay = useMaskStore((s) => s.showMaskOverlay);
  const brushSettings = useMaskStore((s) => s.brushSettings);
  const addBrushStroke = useMaskStore((s) => s.addBrushStroke);
  const setIsDrawing = useMaskStore((s) => s.setIsDrawing);
  const updateMask = useMaskStore((s) => s.updateMask);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGLImageRenderer | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Brush painting state (not in React state for perf — mutated in pointer handlers)
  const paintingRef = useRef(false);
  const currentStrokeRef = useRef<Array<{ x: number; y: number; pressure: number }>>([]);

  const activeImage = images.find((img) => img.id === activeImageId);
  const activeFilePath = activeImage?.file_path;

  // ═══════════════════════════════════════════════
  // Canvas sizing via ResizeObserver
  // ═══════════════════════════════════════════════
  const sizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
      console.log(`[DevelopView] Canvas sized: ${w}×${h}`);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      sizeCanvas();
      // Re-render after resize
      if (rendererRef.current && loadedImageRef.current) {
        try {
          rendererRef.current.render(edits);
        } catch (e) {
          console.error('[DevelopView] Render after resize failed:', e);
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [sizeCanvas, edits]);

  // ═══════════════════════════════════════════════
  // WebGL Renderer lifecycle
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      rendererRef.current = new WebGLImageRenderer(canvasRef.current);
      activeRendererRef = rendererRef.current;
      console.log('[DevelopView] WebGL renderer created');
    } catch (e) {
      console.error('[DevelopView] WebGL init FAILED:', e);
      rendererRef.current = null;
    }

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
      activeRendererRef = null;
      activeImageElementRef = null;
    };
  }, []);

  // ═══════════════════════════════════════════════
  // Image loading — ONLY depends on file path
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (!activeFilePath || !canvasRef.current) return;

    let cancelled = false;

    const loadImage = async () => {
      setImageLoaded(false);
      loadedImageRef.current = null;
      console.log(`[DevelopView] Loading image: ${activeFilePath}`);

      // Load image via IPC as base64
      let dataUri = '';
      if (window.electronAPI) {
        try {
          dataUri = await window.electronAPI.loadImageBase64(activeFilePath, 2048);
          console.log(`[DevelopView] IPC result: ${dataUri ? `${dataUri.length} chars` : 'EMPTY'}`);
        } catch (e) {
          console.error('[DevelopView] IPC image load FAILED:', e);
        }
      }

      if (!dataUri || cancelled) {
        console.warn('[DevelopView] No image data or cancelled');
        return;
      }

      const img = new Image();

      img.onload = () => {
        if (cancelled) return;
        console.log(`[DevelopView] Image decoded: ${img.width}×${img.height}`);

        loadedImageRef.current = img;
        activeImageElementRef = img;

        // Ensure canvas has correct dimensions
        sizeCanvas();

        const canvas = canvasRef.current;
        if (!canvas) {
          console.error('[DevelopView] Canvas ref is null after image load!');
          setImageLoaded(true);
          return;
        }

        console.log(`[DevelopView] Canvas dims: ${canvas.width}×${canvas.height}`);

        // Try WebGL rendering
        const renderer = rendererRef.current;
        if (renderer) {
          try {
            renderer.loadImage(img);
            renderer.render(edits);
            console.log('[DevelopView] WebGL render SUCCESS');
          } catch (e) {
            console.error('[DevelopView] WebGL render FAILED:', e);
          }
        } else {
          console.warn('[DevelopView] No WebGL renderer available');
        }

        setImageLoaded(true);

        // Safety: re-render after a frame to ensure layout is settled
        requestAnimationFrame(() => {
          if (cancelled) return;
          sizeCanvas();
          if (renderer && loadedImageRef.current) {
            try {
              renderer.render(edits);
            } catch (e) {
              console.error('[DevelopView] RAF re-render failed:', e);
            }
          }
        });
      };

      img.onerror = (e) => {
        console.error('[DevelopView] Image decode FAILED for:', activeFilePath, e);
        setImageLoaded(false);
      };

      img.src = dataUri;
    };

    loadImage();

    return () => { cancelled = true; };
  }, [activeFilePath, sizeCanvas]);

  // ═══════════════════════════════════════════════
  // Re-render on edit or mask changes
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (!imageLoaded || !rendererRef.current || !loadedImageRef.current) return;

    const renderer = rendererRef.current;
    const img = loadedImageRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const enabledMasks = masks.filter((m) => m.enabled);

      if (enabledMasks.length === 0) {
        renderer.render(edits);
      } else {
        const maskCanvases = enabledMasks.map((mask) =>
          MaskRasterizer.rasterize(mask, canvas.width, canvas.height, img.width, img.height),
        );
        renderer.renderWithMasks(edits, enabledMasks, maskCanvases);
      }
    } catch (e) {
      console.error('[DevelopView] Render on edits/masks failed:', e);
    }

    // Update mask overlay
    renderMaskOverlay();
  }, [edits, masks, imageLoaded]);

  // Re-render on zoom/pan changes
  useEffect(() => {
    if (!imageLoaded || !rendererRef.current) return;
    try {
      rendererRef.current.render(edits);
    } catch (e) {
      console.error('[DevelopView] Zoom/pan re-render failed:', e);
    }
  }, [zoomLevel, offset]);

  // ═══════════════════════════════════════════════
  // Mask overlay (red/blue tint showing masked area)
  // ═══════════════════════════════════════════════
  const renderMaskOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!overlay || !canvas || !img) return;

    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!showMaskOverlay) return;

    const enabledMasks = masks.filter((m) => m.enabled);
    if (enabledMasks.length === 0) return;

    for (const mask of enabledMasks) {
      const alphaCvs = MaskRasterizer.rasterize(
        mask, canvas.width, canvas.height, img.width, img.height,
      );
      const isActive = mask.id === activeMaskId;
      const tintColor = isActive ? 'rgba(255, 60, 60, 0.4)' : 'rgba(60, 120, 255, 0.25)';

      const tempCvs = document.createElement('canvas');
      tempCvs.width = overlay.width;
      tempCvs.height = overlay.height;
      const tCtx = tempCvs.getContext('2d')!;
      tCtx.fillStyle = tintColor;
      tCtx.fillRect(0, 0, tempCvs.width, tempCvs.height);
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(alphaCvs, 0, 0);
      ctx.drawImage(tempCvs, 0, 0);
    }
  }, [masks, activeMaskId, showMaskOverlay]);

  useEffect(() => {
    renderMaskOverlay();
  }, [showMaskOverlay, masks, activeMaskId, renderMaskOverlay]);

  // ═══════════════════════════════════════════════
  // Brush / gradient pointer interaction
  // ═══════════════════════════════════════════════
  const pageToImage = useCallback((pageX: number, pageY: number) => {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((pageX - rect.left) / canvas.width) * img.width,
      y: ((pageY - rect.top) / canvas.height) * img.height,
    };
  }, []);

  const isMaskMode = activeTool === 'brush' && activeMaskId != null;
  const isGradientDrag = (activeTool === 'linearGradient' || activeTool === 'radialGradient') && activeMaskId != null;
  const gradientDragRef = useRef<{ startX: number; startY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isMaskMode && e.button === 0 && !e.altKey) {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      paintingRef.current = true;
      setIsDrawing(true);
      const pt = pageToImage(e.clientX, e.clientY);
      if (pt) currentStrokeRef.current = [{ x: pt.x, y: pt.y, pressure: e.pressure || 0.5 }];
      return;
    }
    if (isGradientDrag && e.button === 0 && !e.altKey) {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      gradientDragRef.current = {
        startX: (e.clientX - rect.left) / canvas.width,
        startY: (e.clientY - rect.top) / canvas.height,
      };
      return;
    }
    if (e.button === 0 && (e.altKey || zoomLevel > 1)) {
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [isMaskMode, isGradientDrag, zoomLevel, offset, pageToImage, setIsDrawing]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Track cursor for brush size indicator
    if (isMaskMode) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }

    if (paintingRef.current) {
      const pt = pageToImage(e.clientX, e.clientY);
      if (pt) {
        currentStrokeRef.current.push({ x: pt.x, y: pt.y, pressure: e.pressure || 0.5 });
        const overlay = overlayRef.current;
        const canvas = canvasRef.current;
        if (overlay && canvas) {
          const ctx = overlay.getContext('2d');
          if (ctx) {
            const scaleX = canvas.width / (loadedImageRef.current?.width || 1);
            const cx = pt.x * scaleX;
            const cy = pt.y * (canvas.height / (loadedImageRef.current?.height || 1));
            const r = (brushSettings.size / 2) * scaleX;
            ctx.fillStyle = 'rgba(255, 60, 60, 0.25)';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      return;
    }
    if (gradientDragRef.current && activeMaskId) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / canvas.width;
      const ny = (e.clientY - rect.top) / canvas.height;
      const start = gradientDragRef.current;
      if (activeTool === 'linearGradient') {
        updateMask(activeMaskId, { linearGradient: { startX: start.startX, startY: start.startY, endX: nx, endY: ny } });
      } else if (activeTool === 'radialGradient') {
        updateMask(activeMaskId, {
          radialGradient: {
            centerX: (start.startX + nx) / 2, centerY: (start.startY + ny) / 2,
            radiusX: Math.max(0.02, Math.abs(nx - start.startX) / 2),
            radiusY: Math.max(0.02, Math.abs(ny - start.startY) / 2),
            feather: 50, invert: true,
          },
        });
      }
      return;
    }
    if (dragStart) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [dragStart, brushSettings, activeTool, activeMaskId, pageToImage, updateMask]);

  const handlePointerUp = useCallback(() => {
    if (paintingRef.current && activeMaskId) {
      paintingRef.current = false;
      setIsDrawing(false);
      if (currentStrokeRef.current.length > 0) {
        addBrushStroke(activeMaskId, {
          points: currentStrokeRef.current,
          size: brushSettings.size,
          feather: brushSettings.feather,
          flow: brushSettings.flow,
          erase: false,
        });
        currentStrokeRef.current = [];
      }
    }
    if (gradientDragRef.current) gradientDragRef.current = null;
    setDragStart(null);
  }, [activeMaskId, brushSettings, addBrushStroke, setIsDrawing]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoomLevel(zoomLevel + (e.deltaY > 0 ? -0.1 : 0.1));
  }, [zoomLevel, setZoomLevel]);

  const getCursorStyle = (): string => {
    if (dragStart) return 'grabbing';
    if (isMaskMode) return 'none'; // Custom brush cursor rendered via JSX
    if (isGradientDrag) return 'crosshair';
    if (zoomLevel > 1) return 'grab';
    return 'default';
  };

  if (!activeImage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="text-center animate-fade-in">
          <svg className="w-20 h-20 mx-auto mb-5 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-surface-400 font-light">Select a photo to edit</p>
          <p className="text-xs text-surface-600 mt-2">Double-click a photo in the Library to open it here</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative bg-surface-950 overflow-hidden"
      style={{ cursor: getCursorStyle() }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => { handlePointerUp(); setCursorPos(null); }}
    >
      {/* Custom brush cursor */}
      {isMaskMode && cursorPos && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: brushSettings.size * (canvasRef.current ? canvasRef.current.width / (loadedImageRef.current?.width || 1) : 1),
            height: brushSettings.size * (canvasRef.current ? canvasRef.current.height / (loadedImageRef.current?.height || 1) : 1),
            transform: 'translate(-50%, -50%)',
            border: '1.5px solid rgba(255,255,255,0.7)',
            borderRadius: '50%',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
          }}
        />
      )}
      {/* ═══ PRIMARY: WebGL canvas for real-time adjustments ═══ */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Mask overlay canvas (red/blue tint) */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Active mask tool indicator */}
      {activeTool && activeMaskId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="px-3 py-1.5 bg-lumora-500/90 backdrop-blur-sm rounded-full text-2xs text-white font-medium tracking-wide shadow-lg">
            {activeTool === 'brush' ? 'Brush Mask — Paint to select area' :
             activeTool === 'linearGradient' ? 'Linear Gradient — Drag to create' :
             activeTool === 'radialGradient' ? 'Radial Gradient — Drag to create' :
             'Luminosity Mask'}
          </div>
        </div>
      )}

      {/* Mask overlay toggle indicator */}
      {showMaskOverlay && masks.some((m) => m.enabled) && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="px-2 py-1 bg-red-500/80 backdrop-blur-sm rounded text-2xs text-white font-medium">
            OVERLAY
          </div>
        </div>
      )}

      {/* Before/After split view */}
      {showBeforeAfter && imageLoaded && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40" />
          <div className="absolute left-1/2 top-4 -translate-x-[calc(100%+8px)]">
            <span className="px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-2xs text-white/80 font-medium tracking-wide">
              BEFORE
            </span>
          </div>
          <div className="absolute left-1/2 top-4 translate-x-2">
            <span className="px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-2xs text-white/80 font-medium tracking-wide">
              AFTER
            </span>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-950">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-lumora-500/20 border-t-lumora-500 rounded-full animate-spin" />
            <span className="text-2xs text-surface-500">Loading image...</span>
          </div>
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-2xs">
          <div className="flex items-center gap-3 text-white/50">
            <span className="font-medium">{activeImage.file_name}</span>
            {activeImage.width && activeImage.height && (
              <span>{activeImage.width} × {activeImage.height}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-white/50">
            {masks.filter((m) => m.enabled).length > 0 && (
              <span className="bg-lumora-500/30 px-1.5 py-0.5 rounded text-2xs font-medium text-lumora-300">
                {masks.filter((m) => m.enabled).length} mask{masks.filter((m) => m.enabled).length !== 1 ? 's' : ''}
              </span>
            )}
            <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-2xs font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
