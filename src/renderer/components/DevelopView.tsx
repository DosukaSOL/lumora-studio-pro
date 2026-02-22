/**
 * Lumora Studio Pro — Develop View
 * 
 * Single image editing view with real-time preview,
 * before/after comparison, and zoom controls.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { useEditStore } from '../stores/editStore';
import { WebGLImageRenderer } from '../engine/WebGLRenderer';

export const DevelopView: React.FC = () => {
  const { activeImageId, images, showBeforeAfter, zoomLevel, setZoomLevel } = useAppStore();
  const { edits } = useEditStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WebGLImageRenderer | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const activeImage = images.find((img) => img.id === activeImageId);

  // Initialize WebGL renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    
    try {
      rendererRef.current = new WebGLImageRenderer(canvasRef.current);
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to 2D:', e);
    }

    return () => {
      rendererRef.current?.destroy();
    };
  }, []);

  // Load image when active image changes
  useEffect(() => {
    if (!activeImage || !canvasRef.current) return;

    const loadImage = async () => {
      setImageLoaded(false);
      const img = new Image();
      
      img.onload = () => {
        if (canvasRef.current) {
          const container = containerRef.current;
          if (container) {
            canvasRef.current.width = container.clientWidth;
            canvasRef.current.height = container.clientHeight;
          }
          
          if (rendererRef.current) {
            rendererRef.current.loadImage(img);
            rendererRef.current.render(edits);
          } else {
            // Fallback 2D rendering
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const scale = Math.min(
                canvasRef.current.width / img.width,
                canvasRef.current.height / img.height
              ) * zoomLevel;
              const x = (canvasRef.current.width - img.width * scale) / 2 + offset.x;
              const y = (canvasRef.current.height - img.height * scale) / 2 + offset.y;
              ctx.fillStyle = '#111';
              ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            }
          }
          setImageLoaded(true);
        }
      };

      // Try to load from file path
      if (activeImage.file_path) {
        img.src = `file://${activeImage.file_path}`;
      } else if (activeImage.preview_path) {
        img.src = `file://${activeImage.preview_path}`;
      }
    };

    loadImage();
  }, [activeImage, zoomLevel, offset]);

  // Re-render on edit changes
  useEffect(() => {
    if (rendererRef.current && imageLoaded) {
      rendererRef.current.render(edits);
    }
  }, [edits, imageLoaded]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        if (rendererRef.current && imageLoaded) {
          rendererRef.current.render(edits);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [edits, imageLoaded]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(zoomLevel + delta);
  }, [zoomLevel, setZoomLevel]);

  // Pan with mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && (e.altKey || zoomLevel > 1)) {
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [offset, zoomLevel]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragStart) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragStart(null);
  }, []);

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
      style={{ cursor: dragStart ? 'grabbing' : (zoomLevel > 1 ? 'grab' : 'crosshair') }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Subtle vignette overlay for depth */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)'
      }} />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Before/After split view overlay */}
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
            <span className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-2xs font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
