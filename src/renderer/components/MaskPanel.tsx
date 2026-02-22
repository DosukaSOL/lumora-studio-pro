/**
 * Lumora Studio Pro — Mask Panel Component
 * 
 * UI for creating and managing local adjustment masks.
 * Supports brush, linear gradient, radial gradient, and luminosity masks.
 * Each mask has independent adjustments that only affect the masked area.
 */

import React, { useState } from 'react';
import { CollapsiblePanel } from './CollapsiblePanel';
import { EditSlider } from './EditSlider';
import {
  useMaskStore,
  MaskType,
  Mask,
  MaskAdjustments,
  DEFAULT_MASK_ADJUSTMENTS,
  BUILT_IN_MASK_PRESETS,
} from '../stores/maskStore';

/** Mask type icons */
const MaskTypeIcon: React.FC<{ type: MaskType; size?: number }> = ({ type, size = 16 }) => {
  const s = size;
  switch (type) {
    case 'brush':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    case 'linearGradient':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="7" x2="21" y2="7" opacity={0.4} />
          <line x1="3" y1="17" x2="21" y2="17" opacity={0.4} />
        </svg>
      );
    case 'radialGradient':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );
    case 'luminosity':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
};

/** Single mask adjustment slider group */
const MaskAdjustmentSliders: React.FC<{
  mask: Mask;
  onAdjust: (key: keyof MaskAdjustments, value: number) => void;
}> = ({ mask, onAdjust }) => {
  const adj = mask.adjustments;
  
  return (
    <div className="space-y-0.5">
      <p className="text-2xs text-surface-500 uppercase tracking-wider mb-1 mt-2">Light</p>
      <EditSlider label="Exposure" value={adj.exposure} min={-4} max={4} step={0.01} centered
        onChange={(v) => onAdjust('exposure', v)} formatValue={(v) => v.toFixed(2)} compact />
      <EditSlider label="Contrast" value={adj.contrast} min={-100} max={100} centered
        onChange={(v) => onAdjust('contrast', v)} compact />
      <EditSlider label="Highlights" value={adj.highlights} min={-100} max={100} centered
        onChange={(v) => onAdjust('highlights', v)} compact />
      <EditSlider label="Shadows" value={adj.shadows} min={-100} max={100} centered
        onChange={(v) => onAdjust('shadows', v)} compact />
      <EditSlider label="Whites" value={adj.whites} min={-100} max={100} centered
        onChange={(v) => onAdjust('whites', v)} compact />
      <EditSlider label="Blacks" value={adj.blacks} min={-100} max={100} centered
        onChange={(v) => onAdjust('blacks', v)} compact />

      <p className="text-2xs text-surface-500 uppercase tracking-wider mb-1 mt-3">Color</p>
      <EditSlider label="Temperature" value={adj.temperature} min={-100} max={100} centered
        onChange={(v) => onAdjust('temperature', v)} compact />
      <EditSlider label="Tint" value={adj.tint} min={-100} max={100} centered
        onChange={(v) => onAdjust('tint', v)} compact />
      <EditSlider label="Saturation" value={adj.saturation} min={-100} max={100} centered
        onChange={(v) => onAdjust('saturation', v)} compact />

      <p className="text-2xs text-surface-500 uppercase tracking-wider mb-1 mt-3">Effects</p>
      <EditSlider label="Clarity" value={adj.clarity} min={-100} max={100} centered
        onChange={(v) => onAdjust('clarity', v)} compact />
      <EditSlider label="Dehaze" value={adj.dehaze} min={-100} max={100} centered
        onChange={(v) => onAdjust('dehaze', v)} compact />
      <EditSlider label="Sharpness" value={adj.sharpness} min={-100} max={100} centered
        onChange={(v) => onAdjust('sharpness', v)} compact />
      <EditSlider label="Noise" value={adj.noiseReduction} min={0} max={100}
        onChange={(v) => onAdjust('noiseReduction', v)} compact />
    </div>
  );
};

/** Brush settings panel */
const BrushSettingsPanel: React.FC = () => {
  const { brushSettings, setBrushSettings } = useMaskStore();

  return (
    <div className="space-y-1 px-1 py-2 bg-surface-800/50 rounded-lg mb-2">
      <p className="text-2xs text-surface-500 uppercase tracking-wider mb-1">Brush Settings</p>
      <EditSlider label="Size" value={brushSettings.size} min={1} max={200}
        onChange={(v) => setBrushSettings({ size: v })} compact />
      <EditSlider label="Feather" value={brushSettings.feather} min={0} max={100}
        onChange={(v) => setBrushSettings({ feather: v })} compact />
      <EditSlider label="Flow" value={brushSettings.flow} min={1} max={100}
        onChange={(v) => setBrushSettings({ flow: v })} compact />
      <EditSlider label="Density" value={brushSettings.density} min={1} max={100}
        onChange={(v) => setBrushSettings({ density: v })} compact />
      <label className="flex items-center gap-2 mt-1 cursor-pointer">
        <div
          className={`toggle-switch ${brushSettings.autoMask ? 'active' : ''}`}
          onClick={() => setBrushSettings({ autoMask: !brushSettings.autoMask })}
        />
        <span className="text-2xs text-surface-300">Auto Mask</span>
      </label>
    </div>
  );
};

/** Gradient settings */
const GradientSettings: React.FC<{ mask: Mask }> = ({ mask }) => {
  const { updateMask } = useMaskStore();

  if (mask.type === 'radialGradient' && mask.radialGradient) {
    return (
      <div className="space-y-1 px-1 py-2 bg-surface-800/50 rounded-lg mb-2">
        <p className="text-2xs text-surface-500 uppercase tracking-wider mb-1">Radial Gradient</p>
        <EditSlider label="Feather" value={mask.radialGradient.feather} min={0} max={100}
          onChange={(v) => updateMask(mask.id, { radialGradient: { ...mask.radialGradient!, feather: v } })} compact />
        <label className="flex items-center gap-2 mt-1 cursor-pointer">
          <div
            className={`toggle-switch ${mask.radialGradient.invert ? 'active' : ''}`}
            onClick={() => updateMask(mask.id, {
              radialGradient: { ...mask.radialGradient!, invert: !mask.radialGradient!.invert }
            })}
          />
          <span className="text-2xs text-surface-300">Invert Mask</span>
        </label>
      </div>
    );
  }

  if (mask.type === 'luminosity' && mask.luminosity) {
    return (
      <div className="space-y-1 px-1 py-2 bg-surface-800/50 rounded-lg mb-2">
        <p className="text-2xs text-surface-500 uppercase tracking-wider mb-1">Luminosity Range</p>
        <div className="flex gap-1 mb-2">
          {(['highlights', 'midtones', 'shadows'] as const).map((range) => (
            <button
              key={range}
              className={`flex-1 px-1.5 py-1 text-2xs rounded transition-colors ${
                mask.luminosity!.range === range
                  ? 'bg-lumora-600 text-white'
                  : 'bg-surface-700 text-surface-400 hover:text-surface-200'
              }`}
              onClick={() => updateMask(mask.id, { luminosity: { ...mask.luminosity!, range } })}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
        <EditSlider label="Threshold" value={mask.luminosity.threshold} min={0} max={100}
          onChange={(v) => updateMask(mask.id, { luminosity: { ...mask.luminosity!, threshold: v } })} compact />
        <EditSlider label="Feather" value={mask.luminosity.feather} min={0} max={100}
          onChange={(v) => updateMask(mask.id, { luminosity: { ...mask.luminosity!, feather: v } })} compact />
      </div>
    );
  }

  return null;
};

/** Mask presets picker */
const MaskPresetsDropdown: React.FC<{ maskId: string; onClose: () => void }> = ({ maskId, onClose }) => {
  const { applyMaskPreset, maskPresets } = useMaskStore();

  const grouped = maskPresets.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, typeof maskPresets>);

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto scrollbar-thin">
      {Object.entries(grouped).map(([category, presets]) => (
        <div key={category}>
          <div className="px-3 py-1.5 text-2xs font-medium text-surface-500 uppercase tracking-wider bg-surface-900/50 sticky top-0">
            {category}
          </div>
          {presets.map((preset) => (
            <button
              key={preset.id}
              className="w-full text-left px-3 py-1.5 text-xs text-surface-300 hover:bg-lumora-600/20 hover:text-surface-100 transition-colors flex items-center gap-2"
              onClick={() => {
                applyMaskPreset(maskId, preset);
                onClose();
              }}
            >
              <MaskTypeIcon type={preset.type} size={12} />
              {preset.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

/** Single mask item in the list */
const MaskListItem: React.FC<{ mask: Mask }> = ({ mask }) => {
  const {
    activeMaskId, setActiveMask, toggleMaskEnabled, removeMask,
    duplicateMask, setMaskAdjustment, resetMaskAdjustments,
  } = useMaskStore();
  const isActive = activeMaskId === mask.id;
  const [showPresets, setShowPresets] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { renameMask, setMaskOpacity } = useMaskStore();

  const hasAdjustments = Object.entries(mask.adjustments).some(
    ([k, v]) => v !== DEFAULT_MASK_ADJUSTMENTS[k as keyof MaskAdjustments]
  );

  return (
    <div className={`border rounded-lg transition-all ${isActive ? 'border-lumora-500/50 bg-surface-800/80' : 'border-surface-700/50 bg-surface-800/30'}`}>
      {/* Mask header */}
      <div
        className="flex items-center gap-2 px-2.5 py-2 cursor-pointer"
        onClick={() => setActiveMask(isActive ? null : mask.id)}
      >
        <div className={`text-surface-400 ${isActive ? 'text-lumora-400' : ''}`}>
          <MaskTypeIcon type={mask.type} size={14} />
        </div>
        
        {isRenaming ? (
          <input
            autoFocus
            className="flex-1 text-xs bg-surface-700 px-1 py-0.5 rounded border-0 outline-none"
            defaultValue={mask.name}
            onBlur={(e) => { renameMask(mask.id, e.target.value); setIsRenaming(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { renameMask(mask.id, (e.target as HTMLInputElement).value); setIsRenaming(false); }
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`flex-1 text-xs truncate ${isActive ? 'text-surface-100' : 'text-surface-300'}`}
            onDoubleClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
          >
            {mask.name}
          </span>
        )}

        {hasAdjustments && <div className="w-1.5 h-1.5 rounded-full bg-lumora-500 flex-shrink-0" />}

        <button
          className={`p-0.5 rounded transition-colors ${mask.enabled ? 'text-surface-400 hover:text-surface-200' : 'text-surface-600'}`}
          onClick={(e) => { e.stopPropagation(); toggleMaskEnabled(mask.id); }}
          title={mask.enabled ? 'Disable mask' : 'Enable mask'}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill={mask.enabled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
            {mask.enabled ? (
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            ) : (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            )}
            {mask.enabled && <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" />}
          </svg>
        </button>
      </div>

      {/* Expanded mask controls */}
      {isActive && (
        <div className="px-2.5 pb-3 border-t border-surface-700/50 pt-2">
          {/* Action buttons */}
          <div className="flex gap-1 mb-2">
            <div className="relative flex-1">
              <button
                className="w-full btn-ghost text-2xs flex items-center justify-center gap-1"
                onClick={() => setShowPresets(!showPresets)}
              >
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 3v18M3 12h18" />
                </svg>
                Presets
              </button>
              {showPresets && <MaskPresetsDropdown maskId={mask.id} onClose={() => setShowPresets(false)} />}
            </div>
            <button
              className="btn-ghost text-2xs"
              onClick={() => resetMaskAdjustments(mask.id)}
              title="Reset adjustments"
            >
              Reset
            </button>
            <button
              className="btn-ghost text-2xs"
              onClick={() => duplicateMask(mask.id)}
              title="Duplicate mask"
            >
              Dup
            </button>
            <button
              className="btn-ghost text-2xs text-red-400/60 hover:text-red-400"
              onClick={() => removeMask(mask.id)}
              title="Delete mask"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Mask opacity */}
          <EditSlider label="Opacity" value={mask.opacity} min={0} max={100} defaultValue={100}
            onChange={(v) => setMaskOpacity(mask.id, v)} compact />

          {/* Type-specific settings */}
          {mask.type === 'brush' && <BrushSettingsPanel />}
          <GradientSettings mask={mask} />

          {/* Adjustment sliders */}
          <MaskAdjustmentSliders
            mask={mask}
            onAdjust={(key, value) => setMaskAdjustment(mask.id, key, value)}
          />
        </div>
      )}
    </div>
  );
};

/** Main Mask Panel */
export const MaskPanel: React.FC = () => {
  const { masks, addMask, clearAllMasks, showMaskOverlay, toggleMaskOverlay } = useMaskStore();

  return (
    <CollapsiblePanel
      title="Masking"
      defaultOpen={false}
      headerAction={
        <div className="flex items-center gap-1">
          {masks.length > 0 && (
            <span className="text-2xs text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded-full">
              {masks.length}
            </span>
          )}
        </div>
      }
      isModified={masks.length > 0}
    >
      {/* Add mask buttons */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        {([
          { type: 'brush' as MaskType, label: 'Brush', shortcut: 'K' },
          { type: 'linearGradient' as MaskType, label: 'Linear', shortcut: 'M' },
          { type: 'radialGradient' as MaskType, label: 'Radial', shortcut: '⇧M' },
          { type: 'luminosity' as MaskType, label: 'Lum', shortcut: 'L' },
        ]).map(({ type, label, shortcut }) => (
          <button
            key={type}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-surface-800/60 hover:bg-surface-700 border border-surface-700/50 hover:border-surface-600 transition-all"
            onClick={() => addMask(type)}
            title={`Add ${label} Mask (${shortcut})`}
          >
            <div className="text-surface-400">
              <MaskTypeIcon type={type} size={16} />
            </div>
            <span className="text-2xs text-surface-500">{label}</span>
          </button>
        ))}
      </div>

      {/* Mask overlay toggle */}
      {masks.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`toggle-switch ${showMaskOverlay ? 'active' : ''}`}
              onClick={toggleMaskOverlay}
            />
            <span className="text-2xs text-surface-400">Show Mask Overlay</span>
          </label>
          <button
            className="text-2xs text-surface-500 hover:text-red-400 transition-colors"
            onClick={clearAllMasks}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Mask list */}
      <div className="space-y-1.5">
        {masks.map((mask) => (
          <MaskListItem key={mask.id} mask={mask} />
        ))}
      </div>

      {masks.length === 0 && (
        <div className="text-center py-4">
          <p className="text-2xs text-surface-500">No masks created</p>
          <p className="text-2xs text-surface-600 mt-1">Click a tool above to create a local adjustment</p>
        </div>
      )}
    </CollapsiblePanel>
  );
};
