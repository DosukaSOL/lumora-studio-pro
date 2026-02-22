/**
 * Lumora Studio Pro — Library Grid View
 * 
 * Displays imported photos in a responsive grid.
 * Supports selection, ratings, and color labels.
 */

import React, { useCallback } from 'react';
import { useAppStore, CatalogImage } from '../stores/appStore';

/** Star rating display */
const StarRating: React.FC<{ rating: number; onRate: (r: number) => void }> = ({ rating, onRate }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        onClick={(e) => { e.stopPropagation(); onRate(star === rating ? 0 : star); }}
        className={`text-xs ${star <= rating ? 'text-yellow-400' : 'text-surface-600'} hover:text-yellow-300`}
      >
        ★
      </button>
    ))}
  </div>
);

/** Color label indicator */
const colorLabelMap: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

/** Single grid thumbnail */
const GridThumbnail: React.FC<{
  image: CatalogImage;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onDoubleClick: (id: string) => void;
  size: number;
}> = ({ image, isSelected, onSelect, onDoubleClick, size }) => {
  const handleRate = useCallback((rating: number) => {
    useAppStore.getState().updateImage(image.id, { rating } as any);
    // Also update via IPC if available
    window.electronAPI?.catalogUpdate(image.id, { rating });
  }, [image.id]);

  // Use file path or generate a placeholder
  const imgSrc = image.thumbnail_path
    ? `file://${image.thumbnail_path}`
    : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect fill="%23333" width="${size}" height="${size}"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666" font-size="14">${image.file_name.substring(0, 8)}</text></svg>`)}`;

  return (
    <div
      className={`grid-thumb ${isSelected ? 'selected' : ''}`}
      style={{ width: size, height: size }}
      onClick={(e) => onSelect(image.id, e.metaKey || e.ctrlKey)}
      onDoubleClick={() => onDoubleClick(image.id)}
    >
      <img
        src={imgSrc}
        alt={image.file_name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect fill="%23282828" width="${size}" height="${size}"/><text x="50%" y="45%" text-anchor="middle" dy=".3em" fill="%23555" font-size="12" font-family="sans-serif">${image.file_type?.toUpperCase() || 'IMG'}</text><text x="50%" y="60%" text-anchor="middle" dy=".3em" fill="%23444" font-size="9" font-family="sans-serif">${image.file_name.substring(0, 12)}</text></svg>`)}`;
        }}
      />

      {/* Overlay — shown on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

      {/* Flag indicator */}
      {image.flag === 'pick' && (
        <div className="absolute top-1.5 left-1.5 text-white drop-shadow-lg">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 6v12h2V6H3zm4-2v10l7-5-7-5z" />
          </svg>
        </div>
      )}
      {image.flag === 'reject' && (
        <div className="absolute top-1.5 left-1.5 text-red-500 drop-shadow-lg">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </div>
      )}

      {/* Color label */}
      {image.color_label && image.color_label !== 'none' && (
        <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ${colorLabelMap[image.color_label] || ''} shadow-sm`} />
      )}

      {/* Bottom overlay with name and rating */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-2xs text-white truncate mb-0.5">{image.file_name}</p>
        <StarRating rating={image.rating} onRate={handleRate} />
      </div>
    </div>
  );
};

export const LibraryGrid: React.FC = () => {
  const {
    images,
    selectedImageIds,
    setActiveImageId,
    setSelectedImageIds,
    toggleImageSelection,
    setCurrentModule,
    gridSize,
    filterRating,
    filterFlag,
  } = useAppStore();

  // Filter images
  const filteredImages = images.filter((img) => {
    if (filterRating > 0 && img.rating < filterRating) return false;
    if (filterFlag && filterFlag !== '' && img.flag !== filterFlag) return false;
    return true;
  });

  const handleSelect = useCallback((id: string, multi: boolean) => {
    if (multi) {
      toggleImageSelection(id);
    } else {
      setActiveImageId(id);
    }
  }, [toggleImageSelection, setActiveImageId]);

  const handleDoubleClick = useCallback((id: string) => {
    setActiveImageId(id);
    setCurrentModule('develop');
  }, [setActiveImageId, setCurrentModule]);

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="text-center max-w-md animate-fade-in">
          {/* Logo */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#38a3f8' }} />
                  <stop offset="100%" style={{ stopColor: '#026bc7' }} />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" stroke="url(#emptyGrad)" strokeWidth="1" fill="none" opacity="0.15"/>
              <circle cx="50" cy="50" r="30" stroke="url(#emptyGrad)" strokeWidth="1" fill="none" opacity="0.1"/>
              <path d="M35 62V38l15 12 15-12v24" stroke="url(#emptyGrad)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
            </svg>
            <div className="absolute inset-0 animate-pulse rounded-full" 
                 style={{ background: 'radial-gradient(circle, rgba(14,135,233,0.06) 0%, transparent 70%)' }} />
          </div>

          <h2 className="text-xl font-light text-surface-200 mb-3">Welcome to Lumora Studio Pro</h2>
          <p className="text-sm text-surface-500 mb-8 leading-relaxed max-w-sm mx-auto">
            Import your photos to get started. Supports RAW formats (CR2, CR3, NEF, ARW, DNG), 
            JPEG, PNG, TIFF, and more.
          </p>
          <button
            onClick={async () => {
              if (!window.electronAPI) return;
              const files = await window.electronAPI.openFileDialog();
              if (files) {
                const ids = await window.electronAPI.catalogImport(files);
                const allImages = await window.electronAPI.catalogGetAll();
                useAppStore.getState().setImages(allImages);
              }
            }}
            className="btn-primary px-8 py-2.5 text-sm rounded-lg shadow-lg shadow-lumora-600/20 hover:shadow-lumora-600/30 transition-all"
          >
            Import Photos
          </button>

          <div className="mt-6 flex items-center justify-center gap-6 text-2xs text-surface-600">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-800 rounded text-surface-500 text-2xs">⌘I</kbd> Import
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-800 rounded text-surface-500 text-2xs">G</kbd> Library
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-800 rounded text-surface-500 text-2xs">D</kbd> Develop
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-surface-950 p-4">
      <div className="flex flex-wrap gap-2 content-start">
        {filteredImages.map((image) => (
          <GridThumbnail
            key={image.id}
            image={image}
            isSelected={selectedImageIds.includes(image.id)}
            onSelect={handleSelect}
            onDoubleClick={handleDoubleClick}
            size={gridSize}
          />
        ))}
      </div>

      {filteredImages.length === 0 && images.length > 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-surface-500">No images match the current filter</p>
        </div>
      )}
    </div>
  );
};
