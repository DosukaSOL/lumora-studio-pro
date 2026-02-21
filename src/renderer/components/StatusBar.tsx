/**
 * Lumora Studio Pro — Status Bar
 * 
 * Bottom bar showing image count, selection info,
 * and performance metrics.
 */

import React from 'react';
import { useAppStore } from '../stores/appStore';

export const StatusBar: React.FC = () => {
  const {
    images,
    selectedImageIds,
    activeImageId,
    currentModule,
    isLoading,
    loadingMessage,
    filterRating,
    filterFlag,
    setFilterRating,
    setFilterFlag,
    gridSize,
    setGridSize,
  } = useAppStore();

  const activeImage = images.find((img) => img.id === activeImageId);

  return (
    <div className="h-7 bg-surface-900 border-t border-panel-border flex items-center justify-between px-3 text-2xs text-surface-500 no-drag">
      {/* Left — Image count and selection */}
      <div className="flex items-center gap-3">
        <span>{images.length} photo{images.length !== 1 ? 's' : ''}</span>
        {selectedImageIds.length > 1 && (
          <span>{selectedImageIds.length} selected</span>
        )}
        {isLoading && (
          <span className="text-lumora-400 flex items-center gap-1">
            <div className="w-2 h-2 border border-lumora-400 border-t-transparent rounded-full animate-spin" />
            {loadingMessage || 'Processing...'}
          </span>
        )}
      </div>

      {/* Center — Filter controls */}
      <div className="flex items-center gap-3">
        {/* Rating filter */}
        <div className="flex items-center gap-1">
          <span className="text-surface-600">Rating ≥</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRating(r)}
                className={`w-4 h-4 rounded text-center leading-4 ${
                  filterRating === r ? 'bg-lumora-600 text-white' : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Flag filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterFlag(filterFlag === 'pick' ? '' : 'pick')}
            className={`toolbar-btn p-0.5 ${filterFlag === 'pick' ? 'text-white' : ''}`}
            title="Show Picks"
          >
            ⚑
          </button>
          <button
            onClick={() => setFilterFlag(filterFlag === 'reject' ? '' : 'reject')}
            className={`toolbar-btn p-0.5 ${filterFlag === 'reject' ? 'text-red-400' : ''}`}
            title="Show Rejects"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Right — Thumbnail size slider + info */}
      <div className="flex items-center gap-3">
        {currentModule === 'library' && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <input
              type="range"
              min="100"
              max="400"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="w-16 h-1 appearance-none bg-surface-700 rounded-full"
              style={{ border: 'none' }}
            />
          </div>
        )}

        {activeImage && currentModule === 'develop' && (
          <span>
            {activeImage.camera_make} {activeImage.camera_model}
            {activeImage.aperture ? ` · ƒ/${activeImage.aperture}` : ''}
            {activeImage.shutter_speed ? ` · ${activeImage.shutter_speed}s` : ''}
            {activeImage.iso ? ` · ISO ${activeImage.iso}` : ''}
          </span>
        )}
      </div>
    </div>
  );
};
