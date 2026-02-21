/**
 * Lumora Studio Pro — Module Bar
 * 
 * Tab bar for switching between Library, Develop, Map, and other modules.
 * Positioned at the top of the application.
 */

import React from 'react';
import { useAppStore, AppModule } from '../stores/appStore';

const modules: { id: AppModule; label: string; shortcut: string }[] = [
  { id: 'library', label: 'Library', shortcut: 'G' },
  { id: 'develop', label: 'Develop', shortcut: 'D' },
  { id: 'map', label: 'Map', shortcut: 'M' },
  { id: 'export', label: 'Export', shortcut: 'E' },
];

export const ModuleBar: React.FC = () => {
  const { currentModule, setCurrentModule } = useAppStore();

  return (
    <div className="h-9 bg-surface-900 flex items-center justify-center border-b border-panel-border no-drag">
      <div className="flex items-center gap-0">
        {modules.map((mod) => (
          <button
            key={mod.id}
            className={`module-tab ${currentModule === mod.id ? 'active' : ''}`}
            onClick={() => setCurrentModule(mod.id)}
            title={`${mod.label} (${mod.shortcut})`}
          >
            {mod.label}
          </button>
        ))}
      </div>
    </div>
  );
};
