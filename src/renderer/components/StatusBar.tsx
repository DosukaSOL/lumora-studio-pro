/**
 * Lumora Studio Pro — Status Bar
 * 
 * Bottom bar showing image count, selection info,
 * filter controls, and performance metrics.
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
    <div className="h-7 bg-surface-900/95 backdrop-blur-xl border-t border-surface-800/60 flex items-center justify-between px-3 text-2xs text-surface-500 no-drag relative">
      {/* Top subtle line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-700/20 to-transparent" />

      {/* Left — Image count and selection */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          {images.length} photo{images.length !== 1 ? 's' : ''}
        </span>
        {selectedImageIds.length > 1 && (
          <span className="text-lumora-400/70">{selectedImageIds.length} selected</span>
        )}
        {isLoading && (
          <span className="text-lumora-400 flex items-center gap-1.5">
            <div className="w-2 h-2 border border-lumora-400 border-t-transparent rounded-full animate-spin" />
            {loadingMessage || 'Processing...'}
          </span>
        )}
      </div>

      {/* Center — Filter controls */}
      <div className="flex items-center gap-4">
        {/* Rating filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-surface-600 text-2xs">Rating ≥</span>
          <div className="flex gap-px">
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRating(r)}
                className={`w-4 h-4 rounded-sm text-center leading-4 text-2xs transition-all ${
                  filterRating === r
                    ? 'bg-lumora-600/80 text-white shadow-sm'
                    : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-3 bg-surface-700/50" />

        {/* Flag filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterFlag(filterFlag === 'pick' ? '' : 'pick')}
            className={`p-0.5 rounded-sm transition-all ${
              filterFlag === 'pick' ? 'text-white bg-green-600/30' : 'text-surface-500 hover:text-surface-300'
            }`}
            title="Show Picks"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 6v12h2V6H3zm4-2v10l7-5-7-5z" />
            </svg>
          </button>
          <button
            onClick={() => setFilterFlag(filterFlag === 'reject' ? '' : 'reject')}
            className={`p-0.5 rounded-sm transition-all ${
              filterFlag === 'reject' ? 'text-red-400 bg-red-600/20' : 'text-surface-500 hover:text-surface-300'
            }`}
            title="Show Rejects"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right — Thumbnail size slider + info */}
      <div className="flex items-center gap-3">
        {currentModule === 'library' && (
          <div className="flex items-center gap-2">
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
              className="w-16 h-0.5 appearance-none bg-surface-700 rounded-full accent-lumora-500"
              style={{ border: 'none' }}
            />
            <svg className="w-3.5 h-3.5 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </div>
        )}

        {activeImage && currentModule === 'develop' && (
          <span className="text-surface-500 truncate max-w-xs">
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
