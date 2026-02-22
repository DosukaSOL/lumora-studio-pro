/**
 * Lumora Studio Pro — Center View
 * 
 * Main content area that displays either the Library grid,
 * Develop single-image editor, Map, or Export module.
 */

import React from 'react';
import { useAppStore } from '../stores/appStore';
import { LibraryGrid } from './LibraryGrid';
import { DevelopView } from './DevelopView';
import { MapView } from './MapView';

export const CenterView: React.FC = () => {
  const { currentModule, activeImageId, images } = useAppStore();

  if (currentModule === 'develop') {
    return <DevelopView />;
  }

  if (currentModule === 'map') {
    return <MapView />;
  }

  if (currentModule === 'export') {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-surface-900 border border-surface-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <h2 className="text-base font-light text-surface-300 mb-2">Export Module</h2>
          <p className="text-xs text-surface-500 max-w-xs leading-relaxed">
            Select images in the Library and use the Export button in the toolbar to save processed images
          </p>
        </div>
      </div>
    );
  }

  // Default: Library view
  return <LibraryGrid />;
};
