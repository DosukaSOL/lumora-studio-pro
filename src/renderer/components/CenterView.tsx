/**
 * Lumora Studio Pro — Center View
 * 
 * Main content area that displays either the Library grid
 * or the Develop single-image editor view.
 */

import React from 'react';
import { useAppStore } from '../stores/appStore';
import { LibraryGrid } from './LibraryGrid';
import { DevelopView } from './DevelopView';

export const CenterView: React.FC = () => {
  const { currentModule, activeImageId, images } = useAppStore();

  if (currentModule === 'develop') {
    return <DevelopView />;
  }

  if (currentModule === 'export') {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <h2 className="text-lg font-medium text-surface-300 mb-2">Export Module</h2>
          <p className="text-sm text-surface-500">Select images and use the Export button to save them</p>
        </div>
      </div>
    );
  }

  if (currentModule === 'map') {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-lg font-medium text-surface-300 mb-2">Map Module</h2>
          <p className="text-sm text-surface-500">View geotagged photos on the map</p>
        </div>
      </div>
    );
  }

  // Default: Library view
  return <LibraryGrid />;
};
