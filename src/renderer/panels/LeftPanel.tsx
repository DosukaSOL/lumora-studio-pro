/**
 * Lumora Studio Pro — Left Panel
 * 
 * Contains Navigator preview, Histogram, Presets,
 * History, Snapshots, and Collections panels.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CollapsiblePanel } from '../components/CollapsiblePanel';
import { useAppStore } from '../stores/appStore';
import { useEditStore } from '../stores/editStore';
import { BUILT_IN_PRESETS, getPresetsByCategory, Preset } from '../utils/presets';

/** Navigator Preview — Small preview of active image with zoom rectangle */
const NavigatorPreview: React.FC = () => {
  const { activeImageId, images, zoomLevel } = useAppStore();
  const activeImage = images.find((img) => img.id === activeImageId);
  const [previewSrc, setPreviewSrc] = useState('');

  useEffect(() => {
    if (!activeImage) { setPreviewSrc(''); return; }
    let cancelled = false;

    const load = async () => {
      if (!window.electronAPI) return;

      // If we have a cached thumbnail, read it directly
      if (activeImage.thumbnail_path) {
        try {
          const b64 = await window.electronAPI.readFileAsBase64(activeImage.thumbnail_path);
          if (!cancelled && b64) { setPreviewSrc(b64); return; }
        } catch {}
      }

      // Generate on-the-fly via IPC
      if (activeImage.file_path) {
        try {
          const b64 = await window.electronAPI.thumbnailBase64(activeImage.file_path, 300);
          if (!cancelled && b64) { setPreviewSrc(b64); return; }
        } catch {}
      }

      if (!cancelled) setPreviewSrc('');
    };
    load();
    return () => { cancelled = true; };
  }, [activeImage?.id, activeImage?.thumbnail_path, activeImage?.file_path]);

  if (!activeImage) {
    return (
      <div className="h-36 bg-surface-900/50 flex items-center justify-center">
        <span className="text-2xs text-surface-600">No image selected</span>
      </div>
    );
  }

  return (
    <div className="h-36 bg-surface-900/50 relative overflow-hidden group">
      {previewSrc ? (
        <img
          src={previewSrc}
          alt=""
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-2xs text-surface-500">{activeImage.file_name}</span>
        </div>
      )}
      {/* Zoom indicator pill */}
      <div className="absolute bottom-1.5 right-1.5 text-2xs text-white/70 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full font-medium">
        {Math.round(zoomLevel * 100)}%
      </div>
      {/* Image dimensions on hover */}
      {activeImage.width && activeImage.height && (
        <div className="absolute top-1.5 left-1.5 text-2xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
          {activeImage.width} × {activeImage.height}
        </div>
      )}
    </div>
  );
};

/** Histogram — Displays RGB histogram of the active image */
const Histogram: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeImageId, images } = useAppStore();
  const { edits } = useEditStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear with dark background
    ctx.fillStyle = '#161616';
    ctx.fillRect(0, 0, w, h);

    if (!activeImageId) return;

    // Try to get real histogram from the rendered canvas
    const renderCanvas = document.querySelector('canvas:not([width="260"])') as HTMLCanvasElement | null;
    let redHist = new Float32Array(256);
    let greenHist = new Float32Array(256);
    let blueHist = new Float32Array(256);
    let hasRealData = false;

    if (renderCanvas && renderCanvas.width > 0) {
      try {
        const tempCtx = renderCanvas.getContext('2d') || renderCanvas.getContext('webgl2');
        // For WebGL canvas, use readPixels approach via a temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.min(renderCanvas.width, 400);
        tempCanvas.height = Math.min(renderCanvas.height, 400);
        const tc = tempCanvas.getContext('2d');
        if (tc) {
          tc.drawImage(renderCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
          const imageData = tc.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for performance
            redHist[data[i]] += 1;
            greenHist[data[i + 1]] += 1;
            blueHist[data[i + 2]] += 1;
          }
          hasRealData = true;
        }
      } catch {
        // fallback to simulated
      }
    }

    if (!hasRealData) {
      // Generate simulated histogram
      for (let i = 0; i < 256; i++) {
        const x = i / 255;
        const baseR = Math.exp(-Math.pow((x - 0.45) * 3, 2)) + Math.random() * 0.08;
        const baseG = Math.exp(-Math.pow((x - 0.50) * 3, 2)) + Math.random() * 0.08;
        const baseB = Math.exp(-Math.pow((x - 0.55) * 3, 2)) + Math.random() * 0.08;
        redHist[i] = baseR;
        greenHist[i] = baseG;
        blueHist[i] = baseB;
      }
    }

    // Normalize
    const maxVal = Math.max(
      ...Array.from(redHist),
      ...Array.from(greenHist),
      ...Array.from(blueHist)
    );
    if (maxVal > 0) {
      for (let i = 0; i < 256; i++) {
        redHist[i] /= maxVal;
        greenHist[i] /= maxVal;
        blueHist[i] /= maxVal;
      }
    }

    // Smooth the histogram
    const smooth = (arr: Float32Array, radius: number = 2) => {
      const result = new Float32Array(arr.length);
      for (let i = 0; i < arr.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - radius); j <= Math.min(arr.length - 1, i + radius); j++) {
          sum += arr[j];
          count++;
        }
        result[i] = sum / count;
      }
      return result;
    };

    redHist = smooth(redHist);
    greenHist = smooth(greenHist);
    blueHist = smooth(blueHist);

    // Draw channels with gradient fills
    const drawChannel = (data: Float32Array, r: number, g: number, b: number) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < data.length; i++) {
        const x = (i / 255) * w;
        const y = h - data[i] * h * 0.88;
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      // Create gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.15)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    drawChannel(redHist, 220, 60, 60);
    drawChannel(greenHist, 40, 180, 80);
    drawChannel(blueHist, 60, 120, 230);

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0.25; i <= 0.75; i += 0.25) {
      ctx.beginPath();
      ctx.moveTo(i * w, 0);
      ctx.lineTo(i * w, h);
      ctx.stroke();
    }
  }, [activeImageId, edits]);

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={80}
      className="w-full h-20 rounded-md bg-surface-900"
    />
  );
};

/** Presets List - Enhanced with full categories and descriptions */
const PresetsPanel: React.FC = () => {
  const { applyPreset, pushHistory } = useEditStore();
  const [presets, setPresets] = useState<Preset[]>(BUILT_IN_PRESETS);
  const [expandedCategory, setExpandedCategory] = useState<string>('Auto');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);

  useEffect(() => {
    // Load additional user presets from database
    const loadPresets = async () => {
      if (window.electronAPI) {
        try {
          const data = await window.electronAPI.getPresets();
          if (data && data.length > 0) {
            const userPresets = data.map((p: any) => ({
              ...p,
              isBuiltIn: p.is_built_in || false,
              description: p.description || '',
            }));
            setPresets([...BUILT_IN_PRESETS, ...userPresets]);
          }
        } catch {
          // Use built-in presets only
        }
      }
    };
    loadPresets();
  }, []);

  // Filter by search
  const filteredPresets = searchQuery
    ? presets.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : presets;

  // Group by category
  const categories = getPresetsByCategory(filteredPresets);

  const handleApplyPreset = useCallback((preset: Preset) => {
    pushHistory(`Preset: ${preset.name}`);
    applyPreset(preset.edit_data);
  }, [applyPreset, pushHistory]);

  return (
    <div className="space-y-1">
      {/* Search */}
      <div className="px-1 mb-1">
        <input
          type="text"
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1 text-2xs bg-surface-800 border border-surface-700/50 rounded-md placeholder-surface-600"
        />
      </div>

      {Object.entries(categories).map(([category, catPresets]) => (
        <div key={category}>
          <button
            className="w-full text-left px-2 py-1.5 text-2xs font-medium text-surface-400 hover:text-surface-200 flex items-center gap-1.5 transition-colors"
            onClick={() => setExpandedCategory(expandedCategory === category ? '' : category)}
          >
            <svg
              className={`w-2.5 h-2.5 transition-transform duration-150 ${expandedCategory === category ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span>{category}</span>
            <span className="text-surface-600 ml-auto">{catPresets.length}</span>
          </button>
          {expandedCategory === category && (
            <div className="space-y-0 pb-1">
              {(catPresets as Preset[]).map((preset) => (
                <button
                  key={preset.id}
                  className="w-full text-left px-4 py-1.5 text-xs text-surface-300 hover:bg-lumora-600/10 hover:text-surface-100 transition-all duration-100 relative group"
                  onClick={() => handleApplyPreset(preset)}
                  onMouseEnter={() => setHoveredPreset(preset.id)}
                  onMouseLeave={() => setHoveredPreset(null)}
                >
                  <span className="block">{preset.name}</span>
                  {hoveredPreset === preset.id && preset.description && (
                    <span className="block text-2xs text-surface-500 mt-0.5 leading-tight">{preset.description}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      
      {Object.keys(categories).length === 0 && (
        <p className="text-2xs text-surface-600 px-2 py-2 text-center">No presets match "{searchQuery}"</p>
      )}
    </div>
  );
};

/** History Panel */
const HistoryPanel: React.FC = () => {
  const { history, historyIndex } = useEditStore();

  if (history.length === 0) {
    return <p className="text-2xs text-surface-600 px-1">No edit history yet</p>;
  }

  return (
    <div className="space-y-0 max-h-64 overflow-y-auto scrollbar-thin">
      {history.map((entry, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer transition-all rounded-sm ${
            index <= historyIndex
              ? 'text-surface-300 hover:bg-surface-800/50'
              : 'text-surface-600 opacity-50'
          } ${index === historyIndex ? 'bg-lumora-600/10 text-lumora-300' : ''}`}
          title={new Date(entry.timestamp).toLocaleTimeString()}
        >
          <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
            index === historyIndex ? 'bg-lumora-400' : index <= historyIndex ? 'bg-surface-500' : 'bg-surface-700'
          }`} />
          <span className="truncate">{entry.description}</span>
          <span className="text-2xs text-surface-600 ml-auto flex-shrink-0">
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Collections Panel */
const CollectionsPanel: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    const loadCollections = async () => {
      if (window.electronAPI) {
        try {
          const data = await window.electronAPI.getCollections();
          setCollections(data);
        } catch {
          setCollections([]);
        }
      }
    };
    loadCollections();
  }, []);

  return (
    <div>
      {collections.length === 0 ? (
        <p className="text-2xs text-surface-600 px-1">No collections</p>
      ) : (
        collections.map((col) => (
          <div key={col.id} className="px-2 py-1 text-xs text-surface-300 hover:bg-panel-hover cursor-pointer flex items-center gap-2">
            <svg className="w-3 h-3 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {col.name}
          </div>
        ))
      )}
      <button className="w-full mt-1 px-2 py-1 text-2xs text-surface-500 hover:text-surface-300 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New Collection
      </button>
    </div>
  );
};

/** Snapshots Panel — Save and restore edit states */
const SnapshotsPanel: React.FC = () => {
  const { edits, loadEdits, pushHistory } = useEditStore();
  const [snapshots, setSnapshots] = useState<Array<{ id: string; name: string; edits: any; timestamp: number }>>([]);
  const [isNaming, setIsNaming] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreateSnapshot = useCallback(() => {
    setIsNaming(true);
    setNewName(`Snapshot ${snapshots.length + 1}`);
  }, [snapshots.length]);

  const handleSaveSnapshot = useCallback(() => {
    if (!newName.trim()) return;
    const snapshot = {
      id: Date.now().toString(),
      name: newName.trim(),
      edits: JSON.parse(JSON.stringify(edits)),
      timestamp: Date.now(),
    };
    setSnapshots(prev => [snapshot, ...prev]);
    setIsNaming(false);
    setNewName('');
  }, [newName, edits]);

  const handleRestoreSnapshot = useCallback((snapshot: typeof snapshots[0]) => {
    pushHistory(`Restore: ${snapshot.name}`);
    loadEdits(snapshot.edits);
  }, [loadEdits, pushHistory]);

  const handleDeleteSnapshot = useCallback((id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <div>
      {snapshots.length === 0 && !isNaming && (
        <p className="text-2xs text-surface-600 px-1 mb-1">Save the current state of your edits</p>
      )}
      
      {isNaming && (
        <div className="flex gap-1 mb-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()}
            className="flex-1 px-1.5 py-0.5 text-2xs bg-surface-800 border border-surface-700 rounded"
            autoFocus
          />
          <button onClick={handleSaveSnapshot} className="text-2xs text-lumora-400 hover:text-lumora-300 px-1">Save</button>
          <button onClick={() => setIsNaming(false)} className="text-2xs text-surface-500 hover:text-surface-300 px-1">×</button>
        </div>
      )}
      
      {snapshots.map((snap) => (
        <div
          key={snap.id}
          className="flex items-center justify-between px-2 py-1.5 text-xs text-surface-300 hover:bg-surface-800/50 cursor-pointer group rounded-sm"
          onClick={() => handleRestoreSnapshot(snap)}
        >
          <div>
            <span className="block">{snap.name}</span>
            <span className="text-2xs text-surface-600">{new Date(snap.timestamp).toLocaleTimeString()}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteSnapshot(snap.id); }}
            className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-400 transition-opacity"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      
      <button
        onClick={handleCreateSnapshot}
        className="w-full mt-1 px-2 py-1.5 text-2xs text-surface-500 hover:text-surface-200 flex items-center gap-1.5 hover:bg-surface-800/50 rounded-sm transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New Snapshot
      </button>
    </div>
  );
};

/** Main Left Panel */
export const LeftPanel: React.FC = () => {
  const { currentModule } = useAppStore();

  return (
    <div className="h-full flex flex-col">
      {/* Navigator Preview */}
      <NavigatorPreview />

      {/* Histogram */}
      <CollapsiblePanel title="Histogram" defaultOpen={true}>
        <Histogram />
      </CollapsiblePanel>

      {/* Presets (available in Develop mode) */}
      {currentModule === 'develop' && (
        <CollapsiblePanel title="Presets" defaultOpen={true}>
          <PresetsPanel />
        </CollapsiblePanel>
      )}

      {/* History (available in Develop mode) */}
      {currentModule === 'develop' && (
        <CollapsiblePanel title="History" defaultOpen={false}>
          <HistoryPanel />
        </CollapsiblePanel>
      )}

      {/* Snapshots */}
      {currentModule === 'develop' && (
        <CollapsiblePanel title="Snapshots" defaultOpen={false}>
          <SnapshotsPanel />
        </CollapsiblePanel>
      )}

      {/* Collections (in Library mode) */}
      {currentModule === 'library' && (
        <CollapsiblePanel title="Collections" defaultOpen={true}>
          <CollectionsPanel />
        </CollapsiblePanel>
      )}

      {/* Folders (in Library mode) */}
      {currentModule === 'library' && (
        <CollapsiblePanel title="Folders" defaultOpen={false}>
          <p className="text-2xs text-surface-600 px-1">No folders synced</p>
          <button className="w-full mt-1 px-2 py-1 text-2xs text-surface-500 hover:text-surface-300 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Folder
          </button>
        </CollapsiblePanel>
      )}

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
};
