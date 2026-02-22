/**
 * Lumora Studio Pro — Right Panel
 * 
 * Contains ALL editing controls in collapsible panels,
 * matching the professional photo editor workflow:
 * 
 * Basic → Tone Curve → HSL/Color → Color Grading → Detail → 
 * Optics → Geometry → Effects → Calibration
 */

import React, { useState } from 'react';
import { CollapsiblePanel } from '../components/CollapsiblePanel';
import { EditSlider } from '../components/EditSlider';
import { useEditStore, DEFAULT_EDITS } from '../stores/editStore';
import { useAppStore } from '../stores/appStore';
import { ToneCurveEditor } from '../components/ToneCurveEditor';
import { MaskPanel } from '../components/MaskPanel';

/** White balance presets */
const WB_PRESETS = [
  { label: 'As Shot', value: 'as-shot' },
  { label: 'Auto', value: 'auto' },
  { label: 'Daylight', value: 'daylight' },
  { label: 'Cloudy', value: 'cloudy' },
  { label: 'Shade', value: 'shade' },
  { label: 'Tungsten', value: 'tungsten' },
  { label: 'Fluorescent', value: 'fluorescent' },
  { label: 'Flash', value: 'flash' },
];

/** HSL Color names */
const HSL_COLORS = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];

/** Capitalize first letter */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const RightPanel: React.FC = () => {
  const { currentModule } = useAppStore();
  const { edits, setEdit, setNestedEdit, pushHistory, resetEdit } = useEditStore();
  const [hslTab, setHslTab] = useState<'hue' | 'saturation' | 'luminance'>('hue');
  const [curveChannel, setCurveChannel] = useState<'rgb' | 'red' | 'green' | 'blue'>('rgb');

  // Helper to create a slider onChange handler with history tracking
  const makeHandler = (key: string, description: string) => (value: number) => {
    setEdit(key, value);
  };

  const makeEndHandler = (key: string, description: string) => () => {
    pushHistory(description);
  };

  // Check if a section has been modified from defaults
  const isBasicModified = edits.exposure !== 0 || edits.contrast !== 0 || edits.highlights !== 0 ||
    edits.shadows !== 0 || edits.whites !== 0 || edits.blacks !== 0 || edits.temperature !== 0 ||
    edits.tint !== 0 || edits.vibrance !== 0 || edits.saturation !== 0;

  const isDetailModified = edits.sharpening.amount !== 0 || edits.noiseReduction.luminance !== 0;
  const isEffectsModified = edits.texture !== 0 || edits.clarity !== 0 || edits.dehaze !== 0 ||
    edits.vignette.amount !== 0 || edits.grain.amount !== 0;

  // In Library mode — show metadata panel
  if (currentModule === 'library') {
    return <LibraryRightPanel />;
  }

  // Develop mode — show all edit panels
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* ═══════════════════ MASKING ═══════════════════ */}
      <MaskPanel />

      {/* ═══════════════════ BASIC ═══════════════════ */}
      <CollapsiblePanel title="Basic" defaultOpen={true} isModified={isBasicModified}>
        {/* White Balance Preset */}
        <div className="mb-3">
          <label className="text-2xs text-surface-500 mb-1 block">White Balance</label>
          <select
            value={edits.whiteBalancePreset}
            onChange={(e) => {
              setEdit('whiteBalancePreset', e.target.value);
              // Apply WB preset temperatures
              const temps: Record<string, number> = {
                'as-shot': 0, auto: 0, daylight: 100, cloudy: 400,
                shade: 600, tungsten: -800, fluorescent: -200, flash: 200,
              };
              setEdit('temperature', temps[e.target.value] || 0);
              pushHistory('White Balance');
            }}
            className="w-full px-2 py-1 text-xs bg-surface-800 border border-surface-700 rounded"
          >
            {WB_PRESETS.map((wb) => (
              <option key={wb.value} value={wb.value}>{wb.label}</option>
            ))}
          </select>
        </div>

        <EditSlider label="Temperature" value={edits.temperature} min={-2000} max={2000} step={10}
          centered onChange={makeHandler('temperature', 'Temperature')}
          onChangeEnd={makeEndHandler('temperature', 'Temperature')} />

        <EditSlider label="Tint" value={edits.tint} min={-150} max={150}
          centered onChange={makeHandler('tint', 'Tint')}
          onChangeEnd={makeEndHandler('tint', 'Tint')} />

        <div className="h-px bg-panel-border my-2" />

        <EditSlider label="Exposure" value={edits.exposure} min={-5} max={5} step={0.01}
          centered onChange={makeHandler('exposure', 'Exposure')}
          onChangeEnd={makeEndHandler('exposure', 'Exposure')}
          formatValue={(v) => (v >= 0 ? '+' : '') + v.toFixed(2)} />

        <EditSlider label="Contrast" value={edits.contrast} min={-100} max={100}
          centered onChange={makeHandler('contrast', 'Contrast')}
          onChangeEnd={makeEndHandler('contrast', 'Contrast')} />

        <EditSlider label="Highlights" value={edits.highlights} min={-100} max={100}
          centered onChange={makeHandler('highlights', 'Highlights')}
          onChangeEnd={makeEndHandler('highlights', 'Highlights')} />

        <EditSlider label="Shadows" value={edits.shadows} min={-100} max={100}
          centered onChange={makeHandler('shadows', 'Shadows')}
          onChangeEnd={makeEndHandler('shadows', 'Shadows')} />

        <EditSlider label="Whites" value={edits.whites} min={-100} max={100}
          centered onChange={makeHandler('whites', 'Whites')}
          onChangeEnd={makeEndHandler('whites', 'Whites')} />

        <EditSlider label="Blacks" value={edits.blacks} min={-100} max={100}
          centered onChange={makeHandler('blacks', 'Blacks')}
          onChangeEnd={makeEndHandler('blacks', 'Blacks')} />

        <div className="h-px bg-panel-border my-2" />

        <EditSlider label="Vibrance" value={edits.vibrance} min={-100} max={100}
          centered onChange={makeHandler('vibrance', 'Vibrance')}
          onChangeEnd={makeEndHandler('vibrance', 'Vibrance')} />

        <EditSlider label="Saturation" value={edits.saturation} min={-100} max={100}
          centered onChange={makeHandler('saturation', 'Saturation')}
          onChangeEnd={makeEndHandler('saturation', 'Saturation')} />
      </CollapsiblePanel>

      {/* ═══════════════════ TONE CURVE ═══════════════════ */}
      <CollapsiblePanel
        title="Tone Curve"
        defaultOpen={false}
        headerAction={
          <div className="flex gap-1">
            {(['rgb', 'red', 'green', 'blue'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setCurveChannel(ch)}
                className={`w-5 h-4 text-2xs rounded ${
                  curveChannel === ch
                    ? ch === 'rgb' ? 'bg-surface-500 text-white'
                    : ch === 'red' ? 'bg-red-500/30 text-red-400'
                    : ch === 'green' ? 'bg-green-500/30 text-green-400'
                    : 'bg-blue-500/30 text-blue-400'
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                {ch === 'rgb' ? 'W' : ch.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        }
      >
        <ToneCurveEditor
          channel={curveChannel}
          points={edits.toneCurve.points}
          onChange={(points) => {
            setNestedEdit(['toneCurve', 'points'], points);
          }}
        />
      </CollapsiblePanel>

      {/* ═══════════════════ HSL / COLOR MIXER ═══════════════════ */}
      <CollapsiblePanel
        title="HSL / Color"
        defaultOpen={false}
        headerAction={
          <div className="flex gap-0.5">
            {(['hue', 'saturation', 'luminance'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setHslTab(tab)}
                className={`px-1.5 py-0.5 text-2xs rounded ${
                  hslTab === tab ? 'bg-surface-600 text-surface-100' : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                {tab.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        }
      >
        {HSL_COLORS.map((color) => {
          const key = `${color}${cap(hslTab === 'saturation' ? 'Sat' : hslTab === 'luminance' ? 'Lum' : 'Hue')}`;
          const value = (edits.hsl as any)[key] || 0;
          return (
            <EditSlider
              key={`${color}-${hslTab}`}
              label={cap(color)}
              value={value}
              min={hslTab === 'hue' ? -100 : -100}
              max={100}
              centered
              onChange={(v) => setNestedEdit(['hsl', key], v)}
              onChangeEnd={() => pushHistory(`HSL ${cap(color)} ${cap(hslTab)}`)}
            />
          );
        })}
      </CollapsiblePanel>

      {/* ═══════════════════ COLOR GRADING ═══════════════════ */}
      <CollapsiblePanel title="Color Grading" defaultOpen={false}>
        <div className="space-y-3">
          {/* Shadows */}
          <div>
            <p className="text-2xs text-surface-500 mb-1">Shadows</p>
            <EditSlider label="Hue" value={edits.colorGrading.shadowsHue} min={0} max={360}
              onChange={(v) => setNestedEdit(['colorGrading', 'shadowsHue'], v)}
              onChangeEnd={() => pushHistory('Color Grading Shadows Hue')} />
            <EditSlider label="Saturation" value={edits.colorGrading.shadowsSat} min={0} max={100}
              onChange={(v) => setNestedEdit(['colorGrading', 'shadowsSat'], v)}
              onChangeEnd={() => pushHistory('Color Grading Shadows Sat')} />
          </div>

          {/* Midtones */}
          <div>
            <p className="text-2xs text-surface-500 mb-1">Midtones</p>
            <EditSlider label="Hue" value={edits.colorGrading.midtonesHue} min={0} max={360}
              onChange={(v) => setNestedEdit(['colorGrading', 'midtonesHue'], v)}
              onChangeEnd={() => pushHistory('Color Grading Midtones Hue')} />
            <EditSlider label="Saturation" value={edits.colorGrading.midtonesSat} min={0} max={100}
              onChange={(v) => setNestedEdit(['colorGrading', 'midtonesSat'], v)}
              onChangeEnd={() => pushHistory('Color Grading Midtones Sat')} />
          </div>

          {/* Highlights */}
          <div>
            <p className="text-2xs text-surface-500 mb-1">Highlights</p>
            <EditSlider label="Hue" value={edits.colorGrading.highlightsHue} min={0} max={360}
              onChange={(v) => setNestedEdit(['colorGrading', 'highlightsHue'], v)}
              onChangeEnd={() => pushHistory('Color Grading Highlights Hue')} />
            <EditSlider label="Saturation" value={edits.colorGrading.highlightsSat} min={0} max={100}
              onChange={(v) => setNestedEdit(['colorGrading', 'highlightsSat'], v)}
              onChangeEnd={() => pushHistory('Color Grading Highlights Sat')} />
          </div>

          <div className="h-px bg-panel-border" />

          <EditSlider label="Blending" value={edits.colorGrading.blending} min={0} max={100} defaultValue={50}
            onChange={(v) => setNestedEdit(['colorGrading', 'blending'], v)}
            onChangeEnd={() => pushHistory('Color Grading Blending')} />

          <EditSlider label="Balance" value={edits.colorGrading.balance} min={-100} max={100}
            centered onChange={(v) => setNestedEdit(['colorGrading', 'balance'], v)}
            onChangeEnd={() => pushHistory('Color Grading Balance')} />
        </div>
      </CollapsiblePanel>

      {/* ═══════════════════ DETAIL ═══════════════════ */}
      <CollapsiblePanel title="Detail" defaultOpen={false} isModified={isDetailModified}>
        <p className="text-2xs text-surface-500 mb-1">Sharpening</p>
        <EditSlider label="Amount" value={edits.sharpening.amount} min={0} max={150}
          onChange={(v) => setNestedEdit(['sharpening', 'amount'], v)}
          onChangeEnd={() => pushHistory('Sharpening Amount')} />
        <EditSlider label="Radius" value={edits.sharpening.radius} min={0.5} max={3.0} step={0.1} defaultValue={1.0}
          onChange={(v) => setNestedEdit(['sharpening', 'radius'], v)}
          onChangeEnd={() => pushHistory('Sharpening Radius')}
          formatValue={(v) => v.toFixed(1)} />
        <EditSlider label="Detail" value={edits.sharpening.detail} min={0} max={100} defaultValue={25}
          onChange={(v) => setNestedEdit(['sharpening', 'detail'], v)}
          onChangeEnd={() => pushHistory('Sharpening Detail')} />
        <EditSlider label="Masking" value={edits.sharpening.masking} min={0} max={100}
          onChange={(v) => setNestedEdit(['sharpening', 'masking'], v)}
          onChangeEnd={() => pushHistory('Sharpening Masking')} />

        <div className="h-px bg-panel-border my-2" />

        <p className="text-2xs text-surface-500 mb-1">Noise Reduction</p>
        <EditSlider label="Luminance" value={edits.noiseReduction.luminance} min={0} max={100}
          onChange={(v) => setNestedEdit(['noiseReduction', 'luminance'], v)}
          onChangeEnd={() => pushHistory('NR Luminance')} />
        <EditSlider label="Color" value={edits.noiseReduction.color} min={0} max={100} defaultValue={25}
          onChange={(v) => setNestedEdit(['noiseReduction', 'color'], v)}
          onChangeEnd={() => pushHistory('NR Color')} />
      </CollapsiblePanel>

      {/* ═══════════════════ OPTICS ═══════════════════ */}
      <CollapsiblePanel title="Optics" defaultOpen={false}>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`toggle-switch ${edits.lensCorrection ? 'active' : ''}`}
              onClick={() => {
                setEdit('lensCorrection', !edits.lensCorrection);
                pushHistory('Lens Correction');
              }}
            />
            <span className="text-xs text-surface-300">Enable Lens Correction</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`toggle-switch ${edits.chromaticAberration ? 'active' : ''}`}
              onClick={() => {
                setEdit('chromaticAberration', !edits.chromaticAberration);
                pushHistory('Chromatic Aberration');
              }}
            />
            <span className="text-xs text-surface-300">Remove Chromatic Aberration</span>
          </label>
        </div>
      </CollapsiblePanel>

      {/* ═══════════════════ GEOMETRY ═══════════════════ */}
      <CollapsiblePanel title="Geometry" defaultOpen={false}>
        {/* Upright modes */}
        <div className="mb-3">
          <label className="text-2xs text-surface-500 mb-1.5 block">Upright</label>
          <div className="flex gap-1">
            {['off', 'auto', 'level', 'vertical', 'full'].map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setEdit('uprightMode', mode);
                  pushHistory(`Upright: ${mode}`);
                }}
                className={`flex-1 px-1.5 py-1 text-2xs rounded ${
                  edits.uprightMode === mode
                    ? 'bg-lumora-600 text-white'
                    : 'bg-surface-700 text-surface-400 hover:text-surface-200'
                }`}
              >
                {cap(mode)}
              </button>
            ))}
          </div>
        </div>

        <EditSlider label="Distortion" value={edits.transform.distortion} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['transform', 'distortion'], v)}
          onChangeEnd={() => pushHistory('Distortion')} />
        <EditSlider label="Vertical" value={edits.transform.vertical} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['transform', 'vertical'], v)}
          onChangeEnd={() => pushHistory('Vertical Transform')} />
        <EditSlider label="Horizontal" value={edits.transform.horizontal} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['transform', 'horizontal'], v)}
          onChangeEnd={() => pushHistory('Horizontal Transform')} />
        <EditSlider label="Rotate" value={edits.transform.rotate} min={-10} max={10} step={0.1}
          centered onChange={(v) => setNestedEdit(['transform', 'rotate'], v)}
          onChangeEnd={() => pushHistory('Rotate')}
          formatValue={(v) => v.toFixed(1) + '°'} />
        <EditSlider label="Aspect" value={edits.transform.aspect} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['transform', 'aspect'], v)}
          onChangeEnd={() => pushHistory('Aspect')} />
        <EditSlider label="Scale" value={edits.transform.scale} min={-100} max={100} defaultValue={0}
          centered onChange={(v) => setNestedEdit(['transform', 'scale'], v)}
          onChangeEnd={() => pushHistory('Scale')} />
      </CollapsiblePanel>

      {/* ═══════════════════ EFFECTS ═══════════════════ */}
      <CollapsiblePanel title="Effects" defaultOpen={false} isModified={isEffectsModified}>
        <EditSlider label="Texture" value={edits.texture} min={-100} max={100}
          centered onChange={makeHandler('texture', 'Texture')}
          onChangeEnd={makeEndHandler('texture', 'Texture')} />

        <EditSlider label="Clarity" value={edits.clarity} min={-100} max={100}
          centered onChange={makeHandler('clarity', 'Clarity')}
          onChangeEnd={makeEndHandler('clarity', 'Clarity')} />

        <EditSlider label="Dehaze" value={edits.dehaze} min={-100} max={100}
          centered onChange={makeHandler('dehaze', 'Dehaze')}
          onChangeEnd={makeEndHandler('dehaze', 'Dehaze')} />

        <div className="h-px bg-panel-border my-2" />

        <p className="text-2xs text-surface-500 mb-1">Post-Crop Vignetting</p>
        <EditSlider label="Amount" value={edits.vignette.amount} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['vignette', 'amount'], v)}
          onChangeEnd={() => pushHistory('Vignette Amount')} />
        <EditSlider label="Midpoint" value={edits.vignette.midpoint} min={0} max={100} defaultValue={50}
          onChange={(v) => setNestedEdit(['vignette', 'midpoint'], v)}
          onChangeEnd={() => pushHistory('Vignette Midpoint')} />
        <EditSlider label="Roundness" value={edits.vignette.roundness} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['vignette', 'roundness'], v)}
          onChangeEnd={() => pushHistory('Vignette Roundness')} />
        <EditSlider label="Feather" value={edits.vignette.feather} min={0} max={100} defaultValue={50}
          onChange={(v) => setNestedEdit(['vignette', 'feather'], v)}
          onChangeEnd={() => pushHistory('Vignette Feather')} />
        <EditSlider label="Highlights" value={edits.vignette.highlights} min={0} max={100}
          onChange={(v) => setNestedEdit(['vignette', 'highlights'], v)}
          onChangeEnd={() => pushHistory('Vignette Highlights')} />

        <div className="h-px bg-panel-border my-2" />

        <p className="text-2xs text-surface-500 mb-1">Grain</p>
        <EditSlider label="Amount" value={edits.grain.amount} min={0} max={100}
          onChange={(v) => setNestedEdit(['grain', 'amount'], v)}
          onChangeEnd={() => pushHistory('Grain Amount')} />
        <EditSlider label="Size" value={edits.grain.size} min={1} max={100} defaultValue={25}
          onChange={(v) => setNestedEdit(['grain', 'size'], v)}
          onChangeEnd={() => pushHistory('Grain Size')} />
        <EditSlider label="Roughness" value={edits.grain.roughness} min={0} max={100} defaultValue={50}
          onChange={(v) => setNestedEdit(['grain', 'roughness'], v)}
          onChangeEnd={() => pushHistory('Grain Roughness')} />
      </CollapsiblePanel>

      {/* ═══════════════════ CALIBRATION ═══════════════════ */}
      <CollapsiblePanel title="Calibration" defaultOpen={false}>
        <EditSlider label="Shadows Tint" value={edits.calibration.shadowsTint} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['calibration', 'shadowsTint'], v)}
          onChangeEnd={() => pushHistory('Calibration Shadows Tint')} />

        <div className="h-px bg-panel-border my-2" />
        <p className="text-2xs text-surface-500 mb-1">Red Primary</p>
        <EditSlider label="Hue" value={edits.calibration.redPrimary.hue} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['calibration', 'redPrimary', 'hue'], v)}
          onChangeEnd={() => pushHistory('Red Primary Hue')} />
        <EditSlider label="Saturation" value={edits.calibration.redPrimary.saturation} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['calibration', 'redPrimary', 'saturation'], v)}
          onChangeEnd={() => pushHistory('Red Primary Saturation')} />

        <div className="h-px bg-panel-border my-2" />
        <p className="text-2xs text-surface-500 mb-1">Green Primary</p>
        <EditSlider label="Hue" value={edits.calibration.greenPrimary.hue} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['calibration', 'greenPrimary', 'hue'], v)}
          onChangeEnd={() => pushHistory('Green Primary Hue')} />
        <EditSlider label="Saturation" value={edits.calibration.greenPrimary.saturation} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['calibration', 'greenPrimary', 'saturation'], v)}
          onChangeEnd={() => pushHistory('Green Primary Saturation')} />

        <div className="h-px bg-panel-border my-2" />
        <p className="text-2xs text-surface-500 mb-1">Blue Primary</p>
        <EditSlider label="Hue" value={edits.calibration.bluePrimary.hue} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['calibration', 'bluePrimary', 'hue'], v)}
          onChangeEnd={() => pushHistory('Blue Primary Hue')} />
        <EditSlider label="Saturation" value={edits.calibration.bluePrimary.saturation} min={-100} max={100}
          centered onChange={(v) => setNestedEdit(['calibration', 'bluePrimary', 'saturation'], v)}
          onChangeEnd={() => pushHistory('Blue Primary Saturation')} />
      </CollapsiblePanel>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
};

/** Library mode right panel — shows metadata for selected image */
const LibraryRightPanel: React.FC = () => {
  const { activeImageId, images, updateImage } = useAppStore();
  const activeImage = images.find((img) => img.id === activeImageId);

  if (!activeImage) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-surface-500">Select an image to view metadata</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Quick Develop */}
      <CollapsiblePanel title="Quick Develop" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-1">
          <button className="btn-ghost text-2xs">Auto Tone</button>
          <button className="btn-ghost text-2xs">Auto WB</button>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-2">
          <button className="btn-ghost text-2xs">Exp -</button>
          <span className="text-2xs text-center text-surface-500 py-1">Exposure</span>
          <button className="btn-ghost text-2xs">Exp +</button>
        </div>
      </CollapsiblePanel>

      {/* Keywording */}
      <CollapsiblePanel title="Keywording" defaultOpen={true}>
        <textarea
          className="w-full h-16 px-2 py-1 text-xs bg-surface-800 border border-surface-700 rounded resize-none"
          placeholder="Add keywords, separated by commas..."
          value={activeImage.keywords}
          onChange={(e) => {
            updateImage(activeImage.id, { keywords: e.target.value } as any);
            window.electronAPI?.catalogUpdate(activeImage.id, { keywords: e.target.value });
          }}
        />
      </CollapsiblePanel>

      {/* Metadata */}
      <CollapsiblePanel title="Metadata" defaultOpen={true}>
        <div className="space-y-1.5">
          <MetadataRow label="File Name" value={activeImage.file_name} />
          <MetadataRow label="File Type" value={activeImage.file_type?.toUpperCase()} />
          <MetadataRow label="Dimensions" value={
            activeImage.width && activeImage.height
              ? `${activeImage.width} × ${activeImage.height}`
              : '—'
          } />
          <MetadataRow label="File Size" value={
            activeImage.file_size
              ? `${(activeImage.file_size / 1024 / 1024).toFixed(1)} MB`
              : '—'
          } />
          <MetadataRow label="Date Taken" value={
            activeImage.date_taken
              ? new Date(activeImage.date_taken).toLocaleString()
              : '—'
          } />
          <MetadataRow label="Camera" value={
            [activeImage.camera_make, activeImage.camera_model].filter(Boolean).join(' ') || '—'
          } />
          <MetadataRow label="Lens" value={activeImage.lens || '—'} />
          <MetadataRow label="Focal Length" value={
            activeImage.focal_length ? `${activeImage.focal_length}mm` : '—'
          } />
          <MetadataRow label="Aperture" value={
            activeImage.aperture ? `ƒ/${activeImage.aperture}` : '—'
          } />
          <MetadataRow label="Shutter" value={activeImage.shutter_speed || '—'} />
          <MetadataRow label="ISO" value={activeImage.iso?.toString() || '—'} />
        </div>
      </CollapsiblePanel>

      {/* Caption */}
      <CollapsiblePanel title="Caption" defaultOpen={false}>
        <textarea
          className="w-full h-20 px-2 py-1 text-xs bg-surface-800 border border-surface-700 rounded resize-none"
          placeholder="Add a caption..."
          value={activeImage.caption}
          onChange={(e) => {
            updateImage(activeImage.id, { caption: e.target.value } as any);
            window.electronAPI?.catalogUpdate(activeImage.id, { caption: e.target.value });
          }}
        />
      </CollapsiblePanel>
    </div>
  );
};

/** Metadata display row */
const MetadataRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-2xs text-surface-500">{label}</span>
    <span className="text-2xs text-surface-300 text-right max-w-[60%] truncate">{value}</span>
  </div>
);
