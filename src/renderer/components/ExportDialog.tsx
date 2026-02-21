/**
 * Lumora Studio Pro — Export Dialog
 * 
 * Full-featured export dialog with format selection,
 * quality control, resize options, and watermark support.
 */

import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useEditStore } from '../stores/editStore';

interface ExportDialogProps {
  onClose: () => void;
}

interface ExportSettings {
  format: 'jpeg' | 'png' | 'tiff';
  quality: number;
  resizeMode: 'none' | 'dimensions' | 'percentage' | 'longEdge';
  width: number;
  height: number;
  percentage: number;
  longEdge: number;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkPosition: string;
  watermarkOpacity: number;
  outputFolder: string;
  namingTemplate: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ onClose }) => {
  const { selectedImageIds, images, activeImageId } = useAppStore();
  const { edits } = useEditStore();

  const [settings, setSettings] = useState<ExportSettings>({
    format: 'jpeg',
    quality: 90,
    resizeMode: 'none',
    width: 3840,
    height: 2160,
    percentage: 100,
    longEdge: 3840,
    watermarkEnabled: false,
    watermarkText: '© Photographer',
    watermarkPosition: 'bottom-right',
    watermarkOpacity: 50,
    outputFolder: '',
    namingTemplate: '{filename}_export',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const imagesToExport = selectedImageIds.length > 0
    ? images.filter((img) => selectedImageIds.includes(img.id))
    : activeImageId
    ? images.filter((img) => img.id === activeImageId)
    : [];

  const handleChooseFolder = async () => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.openFolderDialog();
    if (folder) {
      setSettings({ ...settings, outputFolder: folder });
    }
  };

  const handleExport = async () => {
    if (!window.electronAPI || imagesToExport.length === 0) return;

    setIsExporting(true);
    setProgress(0);

    for (let i = 0; i < imagesToExport.length; i++) {
      const image = imagesToExport[i];
      try {
        const outputPath = settings.outputFolder
          ? `${settings.outputFolder}/${settings.namingTemplate.replace('{filename}', image.file_name.replace(/\.[^/.]+$/, ''))}.${settings.format === 'jpeg' ? 'jpg' : settings.format}`
          : await window.electronAPI.saveFileDialog({
              defaultPath: `${image.file_name.replace(/\.[^/.]+$/, '')}_export.${settings.format === 'jpeg' ? 'jpg' : settings.format}`,
              filters: [{ name: settings.format.toUpperCase(), extensions: [settings.format === 'jpeg' ? 'jpg' : settings.format] }],
            });

        if (!outputPath) continue;

        await window.electronAPI.exportImage({
          sourcePath: image.file_path,
          outputPath,
          format: settings.format,
          quality: settings.quality,
          ...(settings.resizeMode === 'dimensions' && { width: settings.width, height: settings.height }),
          ...(settings.resizeMode === 'percentage' && { resizePercent: settings.percentage }),
          ...(settings.resizeMode === 'longEdge' && { width: settings.longEdge }),
          operations: edits,
          ...(settings.watermarkEnabled && {
            watermark: {
              text: settings.watermarkText,
              position: settings.watermarkPosition,
              opacity: settings.watermarkOpacity,
            },
          }),
        });
      } catch (err) {
        console.error(`Export failed for ${image.file_name}:`, err);
      }
      setProgress(((i + 1) / imagesToExport.length) * 100);
    }

    setIsExporting(false);
    onClose();
  };

  const update = (key: keyof ExportSettings, value: any) =>
    setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 rounded-xl shadow-2xl w-[520px] max-h-[80vh] overflow-y-auto border border-panel-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border">
          <h2 className="text-sm font-semibold text-surface-100">Export Settings</h2>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Image count */}
          <div className="text-xs text-surface-400">
            {imagesToExport.length} image{imagesToExport.length !== 1 ? 's' : ''} to export
          </div>

          {/* Format */}
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Format</label>
            <div className="flex gap-2">
              {(['jpeg', 'png', 'tiff'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => update('format', fmt)}
                  className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                    settings.format === fmt
                      ? 'border-lumora-500 bg-lumora-600/10 text-lumora-400'
                      : 'border-surface-700 text-surface-400 hover:border-surface-500'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          {settings.format !== 'png' && (
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs text-surface-400">Quality</label>
                <span className="text-xs text-surface-300">{settings.quality}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={settings.quality}
                onChange={(e) => update('quality', Number(e.target.value))}
                className="w-full h-1 appearance-none bg-surface-700 rounded-full"
                style={{ border: 'none' }}
              />
            </div>
          )}

          {/* Resize */}
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Resize</label>
            <select
              value={settings.resizeMode}
              onChange={(e) => update('resizeMode', e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-surface-800 border border-surface-700 rounded"
            >
              <option value="none">Don't Resize</option>
              <option value="dimensions">Specific Dimensions</option>
              <option value="percentage">Percentage</option>
              <option value="longEdge">Long Edge</option>
            </select>

            {settings.resizeMode === 'dimensions' && (
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <label className="text-2xs text-surface-500 mb-0.5 block">Width</label>
                  <input
                    type="number"
                    value={settings.width}
                    onChange={(e) => update('width', Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-2xs text-surface-500 mb-0.5 block">Height</label>
                  <input
                    type="number"
                    value={settings.height}
                    onChange={(e) => update('height', Number(e.target.value))}
                    className="w-full px-2 py-1 text-xs"
                  />
                </div>
              </div>
            )}

            {settings.resizeMode === 'percentage' && (
              <div className="mt-2">
                <input
                  type="number"
                  value={settings.percentage}
                  onChange={(e) => update('percentage', Number(e.target.value))}
                  className="w-24 px-2 py-1 text-xs"
                  min={1}
                  max={200}
                />
                <span className="text-xs text-surface-500 ml-1">%</span>
              </div>
            )}

            {settings.resizeMode === 'longEdge' && (
              <div className="mt-2">
                <input
                  type="number"
                  value={settings.longEdge}
                  onChange={(e) => update('longEdge', Number(e.target.value))}
                  className="w-32 px-2 py-1 text-xs"
                />
                <span className="text-xs text-surface-500 ml-1">px</span>
              </div>
            )}
          </div>

          {/* Watermark */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <div
                className={`toggle-switch ${settings.watermarkEnabled ? 'active' : ''}`}
                onClick={() => update('watermarkEnabled', !settings.watermarkEnabled)}
              />
              <span className="text-xs text-surface-300">Watermark</span>
            </label>

            {settings.watermarkEnabled && (
              <div className="space-y-2 ml-10">
                <input
                  type="text"
                  value={settings.watermarkText}
                  onChange={(e) => update('watermarkText', e.target.value)}
                  placeholder="Watermark text..."
                  className="w-full px-2 py-1 text-xs"
                />
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-surface-500">Opacity</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={settings.watermarkOpacity}
                    onChange={(e) => update('watermarkOpacity', Number(e.target.value))}
                    className="flex-1 h-1 appearance-none bg-surface-700 rounded-full"
                    style={{ border: 'none' }}
                  />
                  <span className="text-2xs text-surface-400 w-8 text-right">
                    {settings.watermarkOpacity}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Output folder */}
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Output Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.outputFolder}
                onChange={(e) => update('outputFolder', e.target.value)}
                placeholder="Choose output folder..."
                className="flex-1 px-2 py-1 text-xs"
                readOnly
              />
              <button onClick={handleChooseFolder} className="btn-secondary text-xs">
                Browse
              </button>
            </div>
          </div>

          {/* File naming */}
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">File Naming</label>
            <input
              type="text"
              value={settings.namingTemplate}
              onChange={(e) => update('namingTemplate', e.target.value)}
              className="w-full px-2 py-1 text-xs"
            />
            <p className="text-2xs text-surface-600 mt-1">
              Use {'{filename}'} for original name
            </p>
          </div>

          {/* Progress */}
          {isExporting && (
            <div>
              <div className="flex justify-between text-2xs text-surface-400 mb-1">
                <span>Exporting...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-lumora-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-panel-border">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || imagesToExport.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : `Export ${imagesToExport.length} Image${imagesToExport.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};
