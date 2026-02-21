/**
 * Lumora Studio Pro — Left Panel
 * 
 * Contains Navigator preview, Histogram, Presets,
 * History, Snapshots, and Collections panels.
 */

import React, { useState, useEffect, useRef } from 'react';
import { CollapsiblePanel } from '../components/CollapsiblePanel';
import { useAppStore } from '../stores/appStore';
import { useEditStore } from '../stores/editStore';

/** Navigator Preview — Small preview of active image */
const NavigatorPreview: React.FC = () => {
  const { activeImageId, images, zoomLevel } = useAppStore();
  const activeImage = images.find((img) => img.id === activeImageId);

  if (!activeImage) {
    return (
      <div className="h-36 bg-surface-900 flex items-center justify-center">
        <span className="text-2xs text-surface-600">No image selected</span>
      </div>
    );
  }

  const imgSrc = activeImage.thumbnail_path
    ? `file://${activeImage.thumbnail_path}`
    : activeImage.preview_path
    ? `file://${activeImage.preview_path}`
    : '';

  return (
    <div className="h-36 bg-surface-900 relative overflow-hidden">
      {imgSrc ? (
        <img src={imgSrc} alt="" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-900">
          <span className="text-2xs text-surface-500">{activeImage.file_name}</span>
        </div>
      )}
      {/* Zoom indicator */}
      <div className="absolute bottom-1 right-1 text-2xs text-white/70 bg-black/50 px-1 rounded">
        {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
};

/** Histogram — Displays RGB histogram of the active image */
const Histogram: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeImageId } = useAppStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    // Generate sample histogram data (in production, this would analyze the actual image)
    const generateChannel = (offset: number = 0) => {
      const data: number[] = [];
      for (let i = 0; i < 256; i++) {
        const x = i / 255;
        // Generate a bell-curve-like distribution with some variation
        const base = Math.exp(-Math.pow((x - 0.5 + offset * 0.1) * 3, 2));
        const noise = Math.random() * 0.15;
        data.push(Math.max(0, Math.min(1, base + noise)));
      }
      return data;
    };

    const drawChannel = (data: number[], color: string, alpha: number = 0.4) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < data.length; i++) {
        const x = (i / 255) * w;
        const y = h - data[i] * h * 0.9;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.fill();
    };

    if (activeImageId) {
      drawChannel(generateChannel(-0.05), 'rgb(239, 68, 68)', 0.35);
      drawChannel(generateChannel(0), 'rgb(34, 197, 94)', 0.35);
      drawChannel(generateChannel(0.05), 'rgb(59, 130, 246)', 0.35);
    }
  }, [activeImageId]);

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={80}
      className="w-full h-20 rounded bg-surface-900"
    />
  );
};

/** Presets List */
const PresetsPanel: React.FC = () => {
  const { applyPreset } = useEditStore();
  const [presets, setPresets] = useState<any[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string>('Basic');

  useEffect(() => {
    // Load presets from database
    const loadPresets = async () => {
      if (window.electronAPI) {
        try {
          const data = await window.electronAPI.getPresets();
          setPresets(data);
        } catch {
          // Use fallback presets
          setPresets([
            { id: '1', name: 'Auto Tone', category: 'Basic', edit_data: { exposure: 0.2, contrast: 15 } },
            { id: '2', name: 'Vivid', category: 'Color', edit_data: { vibrance: 40, saturation: 15 } },
            { id: '3', name: 'Matte', category: 'Creative', edit_data: { blacks: 30, contrast: -10 } },
            { id: '4', name: 'B&W High Contrast', category: 'B&W', edit_data: { saturation: -100, contrast: 50 } },
            { id: '5', name: 'Soft Portrait', category: 'Portrait', edit_data: { clarity: -15, shadows: 20 } },
            { id: '6', name: 'Film Grain', category: 'Creative', edit_data: { grain_amount: 25, temperature: 300 } },
            { id: '7', name: 'Landscape', category: 'Landscape', edit_data: { clarity: 25, vibrance: 30 } },
            { id: '8', name: 'Golden Hour', category: 'Color', edit_data: { temperature: 800, vibrance: 20 } },
          ]);
        }
      }
    };
    loadPresets();
  }, []);

  // Group presets by category
  const categories = presets.reduce((acc, p) => {
    const cat = p.category || 'User';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-0.5">
      {Object.entries(categories).map(([category, catPresets]) => (
        <div key={category}>
          <button
            className="w-full text-left px-2 py-1 text-2xs font-medium text-surface-400 hover:text-surface-200 flex items-center gap-1"
            onClick={() => setExpandedCategory(expandedCategory === category ? '' : category)}
          >
            <svg
              className={`w-2 h-2 transition-transform ${expandedCategory === category ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {category}
          </button>
          {expandedCategory === category && (
            <div className="space-y-0">
              {(catPresets as any[]).map((preset: any) => (
                <button
                  key={preset.id}
                  className="w-full text-left px-4 py-1 text-xs text-surface-300 hover:bg-panel-hover hover:text-surface-100 transition-colors"
                  onClick={() => applyPreset(preset.edit_data)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/** History Panel */
const HistoryPanel: React.FC = () => {
  const { history, historyIndex } = useEditStore();

  if (history.length === 0) {
    return <p className="text-2xs text-surface-600 px-1">No edit history</p>;
  }

  return (
    <div className="space-y-0">
      {history.map((entry, index) => (
        <div
          key={index}
          className={`px-2 py-1 text-xs cursor-pointer transition-colors ${
            index <= historyIndex
              ? 'text-surface-300 hover:bg-panel-hover'
              : 'text-surface-600'
          } ${index === historyIndex ? 'bg-panel-active text-surface-100' : ''}`}
          title={new Date(entry.timestamp).toLocaleTimeString()}
        >
          {entry.description}
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
          <div className="text-2xs text-surface-600 px-1">No snapshots</div>
          <button className="w-full mt-1 px-2 py-1 text-2xs text-surface-500 hover:text-surface-300 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Snapshot
          </button>
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
