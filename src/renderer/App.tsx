/**
 * Lumora Studio Pro — Main App Component
 * 
 * Root component that orchestrates the entire application layout.
 * Professional photo editor with Library and Develop modules.
 */

import React, { useEffect, useCallback } from 'react';
import { useAppStore } from './stores/appStore';
import { useEditStore } from './stores/editStore';
import { TitleBar } from './components/TitleBar';
import { ModuleBar } from './components/ModuleBar';
import { Toolbar } from './components/Toolbar';
import { LeftPanel } from './panels/LeftPanel';
import { RightPanel } from './panels/RightPanel';
import { CenterView } from './components/CenterView';
import { Filmstrip } from './components/Filmstrip';
import { StatusBar } from './components/StatusBar';
import { ExportDialog } from './components/ExportDialog';
import { ImportDialog } from './components/ImportDialog';

interface AppProps {
  onReady: () => void;
}

const App: React.FC<AppProps> = ({ onReady }) => {
  const {
    currentModule,
    leftPanelVisible,
    rightPanelVisible,
    leftPanelWidth,
    rightPanelWidth,
    filmstripVisible,
    setCurrentModule,
    theme,
  } = useAppStore();

  const [showExport, setShowExport] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);

  // Signal the app is ready (removes splash screen)
  useEffect(() => {
    const timer = setTimeout(onReady, 800);
    return () => clearTimeout(timer);
  }, [onReady]);

  // Listen for menu actions from Electron
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanup = window.electronAPI.onMenuAction((action: string) => {
      switch (action) {
        case 'import':
          setShowImport(true);
          break;
        case 'export':
          setShowExport(true);
          break;
        case 'viewLibrary':
          setCurrentModule('library');
          break;
        case 'viewDevelop':
          setCurrentModule('develop');
          break;
        case 'undo':
          useEditStore.getState().undo();
          break;
        case 'redo':
          useEditStore.getState().redo();
          break;
        case 'resetAll':
          useEditStore.getState().resetAllEdits();
          break;
        case 'beforeAfter':
          useAppStore.getState().toggleBeforeAfter();
          break;
        case 'zoomFit':
          useAppStore.getState().setZoomLevel(1);
          break;
        case 'zoom100':
          useAppStore.getState().setZoomLevel(1);
          break;
      }
    });

    return cleanup;
  }, [setCurrentModule]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const cmd = e.metaKey || e.ctrlKey;

      if (e.key === 'g' && !cmd) {
        setCurrentModule('library');
      } else if (e.key === 'd' && !cmd) {
        setCurrentModule('develop');
      } else if (e.key === '\\') {
        useAppStore.getState().toggleBeforeAfter();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        useAppStore.getState().toggleLeftPanel();
        useAppStore.getState().toggleRightPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentModule]);

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'dark' : 'light'}`}>
      {/* Title bar with drag region (macOS) */}
      <TitleBar />

      {/* Module selector + toolbar */}
      <ModuleBar />
      <Toolbar
        onImport={() => setShowImport(true)}
        onExport={() => setShowExport(true)}
      />

      {/* Main content area: Left Panel | Center | Right Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {leftPanelVisible && (
          <div
            className="flex-shrink-0 bg-panel-bg border-r border-panel-border overflow-y-auto scrollbar-thin"
            style={{ width: leftPanelWidth }}
          >
            <LeftPanel />
          </div>
        )}

        {/* Center content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <CenterView />

          {/* Filmstrip at bottom */}
          {filmstripVisible && currentModule === 'develop' && (
            <Filmstrip />
          )}
        </div>

        {/* Right Panel */}
        {rightPanelVisible && (
          <div
            className="flex-shrink-0 bg-panel-bg border-l border-panel-border overflow-y-auto scrollbar-thin"
            style={{ width: rightPanelWidth }}
          >
            <RightPanel />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Modal Dialogs */}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </div>
  );
};

export default App;
