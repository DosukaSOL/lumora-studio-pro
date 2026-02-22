/**
 * Lumora Studio Pro — Toolbar
 * 
 * Secondary toolbar with Import/Export buttons, view controls,
 * auto-enhance toggle, and editing tools (crop, masking, etc.)
 */

import React, { useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { useEditStore } from '../stores/editStore';
import { useMaskStore } from '../stores/maskStore';
import { autoEnhanceFromImage } from '../utils/autoEnhance';

interface ToolbarProps {
  onImport: () => void;
  onExport: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onImport, onExport }) => {
  const {
    currentModule,
    leftPanelVisible,
    rightPanelVisible,
    toggleLeftPanel,
    toggleRightPanel,
    filmstripVisible,
    toggleFilmstrip,
    showBeforeAfter,
    toggleBeforeAfter,
    zoomLevel,
    setZoomLevel,
    libraryViewMode,
    setLibraryViewMode,
    activeImageId,
    images,
  } = useAppStore();

  const { edits, applyPreset, pushHistory } = useEditStore();
  const { addMask, activeTool, setActiveTool } = useMaskStore();
  const [autoEnhanceActive, setAutoEnhanceActive] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const activeImage = images.find((img) => img.id === activeImageId);

  // Auto-enhance handler
  const handleAutoEnhance = useCallback(async () => {
    if (!activeImage) return;
    setIsEnhancing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = activeImage.file_path
          ? `file://${activeImage.file_path}`
          : activeImage.preview_path
          ? `file://${activeImage.preview_path}`
          : '';
      });

      const enhancements = autoEnhanceFromImage(img);
      
      if (!autoEnhanceActive) {
        pushHistory('Auto Enhance');
        applyPreset(enhancements);
        setAutoEnhanceActive(true);
      } else {
        // Toggle off - undo by resetting to pre-enhance state
        useEditStore.getState().undo();
        setAutoEnhanceActive(false);
      }
    } catch (err) {
      console.error('Auto-enhance failed:', err);
      // Fallback to sensible defaults
      if (!autoEnhanceActive) {
        pushHistory('Auto Enhance (Default)');
        applyPreset({
          exposure: 0.15, contrast: 12, highlights: -20, shadows: 25,
          whites: 10, blacks: -8, vibrance: 15, clarity: 8,
        });
        setAutoEnhanceActive(true);
      } else {
        useEditStore.getState().undo();
        setAutoEnhanceActive(false);
      }
    }

    setIsEnhancing(false);
  }, [activeImage, autoEnhanceActive, pushHistory, applyPreset]);

  // Mask tool handlers
  const handleMaskTool = useCallback((type: 'brush' | 'linearGradient' | 'radialGradient') => {
    if (activeTool === type) {
      setActiveTool(null);
    } else {
      addMask(type);
    }
  }, [activeTool, addMask, setActiveTool]);

  return (
    <div className="h-10 bg-surface-900/80 backdrop-blur-xl flex items-center justify-between px-3 border-b border-panel-border/50 no-drag">
      {/* Left side — Import + panel toggles */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onImport}
          className="btn-primary flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Import
        </button>

        <div className="w-px h-5 bg-panel-border/50 mx-1" />

        <button
          onClick={toggleLeftPanel}
          className={`toolbar-btn ${leftPanelVisible ? 'active' : ''}`}
          title="Toggle Left Panel (Tab)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3zm6 0v18" />
          </svg>
        </button>

        <button
          onClick={toggleRightPanel}
          className={`toolbar-btn ${rightPanelVisible ? 'active' : ''}`}
          title="Toggle Right Panel (Tab)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3zm12 0v18" />
          </svg>
        </button>

        {currentModule === 'develop' && (
          <button
            onClick={toggleFilmstrip}
            className={`toolbar-btn ${filmstripVisible ? 'active' : ''}`}
            title="Toggle Filmstrip"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 3h18M5 3v18M19 3v18M8 7h8M8 11h8M8 15h8" />
            </svg>
          </button>
        )}
      </div>

      {/* Center — View/Edit tools */}
      <div className="flex items-center gap-1.5">
        {currentModule === 'library' && (
          <>
            <button
              onClick={() => setLibraryViewMode('grid')}
              className={`toolbar-btn ${libraryViewMode === 'grid' ? 'active' : ''}`}
              title="Grid View (G)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
              </svg>
            </button>
            <button
              onClick={() => setLibraryViewMode('list')}
              className={`toolbar-btn ${libraryViewMode === 'list' ? 'active' : ''}`}
              title="List View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </>
        )}

        {currentModule === 'develop' && (
          <>
            {/* Auto Enhance */}
            <button
              onClick={handleAutoEnhance}
              className={`toolbar-btn relative group ${autoEnhanceActive ? 'active' : ''} ${isEnhancing ? 'animate-pulse' : ''}`}
              title="Auto Enhance (A)"
              disabled={!activeImage || isEnhancing}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              <span className="ml-1 text-2xs hidden sm:inline">Auto</span>
            </button>

            <div className="w-px h-5 bg-panel-border/50 mx-0.5" />

            <button
              onClick={toggleBeforeAfter}
              className={`toolbar-btn ${showBeforeAfter ? 'active' : ''}`}
              title="Before / After (\\)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 3h18v18H3V3z" />
              </svg>
              <span className="ml-1 text-2xs">Y|Y</span>
            </button>

            <div className="w-px h-5 bg-panel-border/50 mx-0.5" />

            {/* Crop tool */}
            <button className="toolbar-btn" title="Crop (R)">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 2v4H2m20 12h-4v4M6 6h12v12H6z" />
              </svg>
            </button>

            {/* Healing tool */}
            <button className="toolbar-btn" title="Healing (Q)">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              </svg>
            </button>

            <div className="w-px h-5 bg-panel-border/50 mx-0.5" />

            {/* Brush mask */}
            <button
              className={`toolbar-btn ${activeTool === 'brush' ? 'active' : ''}`}
              title="Brush Mask (K)"
              onClick={() => handleMaskTool('brush')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            {/* Linear gradient */}
            <button
              className={`toolbar-btn ${activeTool === 'linearGradient' ? 'active' : ''}`}
              title="Linear Gradient (M)"
              onClick={() => handleMaskTool('linearGradient')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </button>

            {/* Radial gradient */}
            <button
              className={`toolbar-btn ${activeTool === 'radialGradient' ? 'active' : ''}`}
              title="Radial Gradient (Shift+M)"
              onClick={() => handleMaskTool('radialGradient')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </button>
          </>
        )}

        {/* Zoom controls */}
        <div className="w-px h-5 bg-panel-border/50 mx-1" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel(zoomLevel - 0.25)}
            className="toolbar-btn"
            title="Zoom Out (-)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="text-2xs text-surface-400 w-10 text-center tabular-nums">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(zoomLevel + 0.25)}
            className="toolbar-btn"
            title="Zoom In (+)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="toolbar-btn"
            title="Fit to View (0)"
          >
            <span className="text-2xs">FIT</span>
          </button>
        </div>
      </div>

      {/* Right side — Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="btn-secondary flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
};
