/**
 * Lumora Studio Pro — Filmstrip
 * 
 * Horizontal scrolling thumbnail strip shown at the bottom
 * of the Develop module for quick image navigation.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useAppStore, CatalogImage } from '../stores/appStore';

/** Filmstrip thumbnail with IPC fallback for image loading */
const FilmstripThumb: React.FC<{
  image: CatalogImage;
  isActive: boolean;
  onClick: () => void;
}> = ({ image, isActive, onClick }) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!window.electronAPI) return;

      // If we have a cached thumbnail, read it directly
      if (image.thumbnail_path) {
        try {
          const b64 = await window.electronAPI.readFileAsBase64(image.thumbnail_path);
          if (!cancelled && b64) { setSrc(b64); return; }
        } catch {}
      }

      // Generate on-the-fly via IPC
      if (image.file_path) {
        try {
          const b64 = await window.electronAPI.thumbnailBase64(image.file_path, 300);
          if (!cancelled && b64) { setSrc(b64); return; }
        } catch {}
      }

      if (!cancelled) setSrc('');
    };
    load();
    return () => { cancelled = true; };
  }, [image.thumbnail_path, image.file_path]);

  return (
    <div
      className={`filmstrip-thumb group ${isActive ? 'selected' : ''}`}
      onClick={onClick}
    >
      {src ? (
        <img
          src={src}
          alt={image.file_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-surface-800 flex items-center justify-center">
          <span className="text-2xs text-surface-600">{image.file_type?.toUpperCase() || 'IMG'}</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className={`absolute inset-0 transition-colors ${isActive ? '' : 'group-hover:bg-white/5'}`} />

      {/* Rating dots */}
      {image.rating > 0 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
          {Array.from({ length: image.rating }, (_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-yellow-400 shadow-sm" />
          ))}
        </div>
      )}

      {/* Color label stripe */}
      {image.color_label && image.color_label !== 'none' && (
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
          image.color_label === 'red' ? 'bg-red-500' :
          image.color_label === 'yellow' ? 'bg-yellow-500' :
          image.color_label === 'green' ? 'bg-green-500' :
          image.color_label === 'blue' ? 'bg-blue-500' :
          image.color_label === 'purple' ? 'bg-purple-500' : ''
        }`} />
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-lumora-400" />
      )}
    </div>
  );
};

export const Filmstrip: React.FC = () => {
  const { images, activeImageId, setActiveImageId } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  if (images.length === 0) return null;

  return (
    <div className="h-20 bg-surface-900/95 backdrop-blur-xl border-t border-surface-800/60 flex items-center px-2 relative">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-700/20 to-transparent" />

      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-thin py-1"
        onWheel={handleWheel}
      >
        {images.map((image) => {
          const isActive = image.id === activeImageId;

          return (
            <FilmstripThumb
              key={image.id}
              image={image}
              isActive={isActive}
              onClick={() => setActiveImageId(image.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
