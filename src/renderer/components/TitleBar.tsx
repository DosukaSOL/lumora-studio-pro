/**
 * Lumora Studio Pro — Title Bar
 * 
 * Custom title bar with drag region and traffic light spacing (macOS).
 */

import React from 'react';

export const TitleBar: React.FC = () => {
  const isMac = navigator.platform.includes('Mac');

  return (
    <div
      className="h-9 bg-surface-950 flex items-center justify-center drag-region border-b border-panel-border relative"
      style={{ paddingLeft: isMac ? 78 : 0 }}
    >
      <span className="text-2xs text-surface-500 font-medium tracking-wider uppercase no-drag">
        Lumora Studio Pro
      </span>
    </div>
  );
};
