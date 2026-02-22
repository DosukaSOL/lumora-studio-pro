/**
 * Lumora Studio Pro — Title Bar
 * 
 * Custom title bar with drag region, traffic light spacing (macOS),
 * and subtle branding.
 */

import React from 'react';

export const TitleBar: React.FC = () => {
  const isMac = navigator.platform.includes('Mac');

  return (
    <div
      className="h-9 bg-surface-950/95 backdrop-blur-xl flex items-center justify-center drag-region border-b border-surface-800/60 relative"
      style={{ paddingLeft: isMac ? 78 : 0 }}
    >
      {/* Subtle gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-700/30 to-transparent" />

      <div className="flex items-center gap-1.5 no-drag">
        {/* Small logo mark */}
        <svg className="w-3.5 h-3.5 text-lumora-500 opacity-60" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="20" opacity="0.5" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.4" />
        </svg>
        <span className="text-2xs text-surface-500 font-medium tracking-[0.2em] uppercase">
          Lumora Studio Pro
        </span>
      </div>
    </div>
  );
};
