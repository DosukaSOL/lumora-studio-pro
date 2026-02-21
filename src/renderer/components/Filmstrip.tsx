/**
 * Lumora Studio Pro — Filmstrip
 * 
 * Horizontal scrolling thumbnail strip shown at the bottom
 * of the Develop module for quick image navigation.
 */

import React from 'react';
import { useAppStore } from '../stores/appStore';

export const Filmstrip: React.FC = () => {
  const { images, activeImageId, setActiveImageId, selectedImageIds } = useAppStore();

  if (images.length === 0) return null;

  return (
    <div className="h-20 bg-surface-900 border-t border-panel-border flex items-center px-2 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-1.5">
        {images.map((image) => {
          const isActive = image.id === activeImageId;
          const isSelected = selectedImageIds.includes(image.id);

          const imgSrc = image.thumbnail_path
            ? `file://${image.thumbnail_path}`
            : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect fill="${isActive ? '#1e3a5f' : '#282828'}" width="60" height="60"/><text x="30" y="33" text-anchor="middle" fill="#555" font-size="8">${image.file_type?.toUpperCase() || 'IMG'}</text></svg>`)}`;

          return (
            <div
              key={image.id}
              className={`filmstrip-thumb ${isActive ? 'selected' : ''}`}
              onClick={() => setActiveImageId(image.id)}
            >
              <img
                src={imgSrc}
                alt={image.file_name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect fill="#282828" width="60" height="60"/><text x="30" y="33" text-anchor="middle" fill="#555" font-size="8">${image.file_type?.toUpperCase() || 'IMG'}</text></svg>`)}`;
                }}
              />
              {/* Rating dots */}
              {image.rating > 0 && (
                <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5">
                  {Array.from({ length: image.rating }, (_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-yellow-400" />
                  ))}
                </div>
              )}
              {/* Color label stripe */}
              {image.color_label && image.color_label !== 'none' && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                  image.color_label === 'red' ? 'bg-red-500' :
                  image.color_label === 'yellow' ? 'bg-yellow-500' :
                  image.color_label === 'green' ? 'bg-green-500' :
                  image.color_label === 'blue' ? 'bg-blue-500' : ''
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
