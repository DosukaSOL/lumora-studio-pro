/**
 * Lumora Studio Pro — Import Dialog
 * 
 * Import dialog for adding photos to the catalog.
 * Supports file selection, folder import, and progress tracking.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

interface ImportDialogProps {
  onClose: () => void;
}

interface ImportOptions {
  source: 'files' | 'folder';
  buildPreviews: boolean;
  dontImportDuplicates: boolean;
  addToCollection: string;
  selectedFiles: string[];
  previewImages: Array<{ path: string; name: string; size: number }>;
}

/** Thumbnail preview that loads via IPC (no localfile:// protocol needed) */
const ImportPreviewThumb: React.FC<{ filePath: string; name: string }> = ({ filePath, name }) => {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSrc('');

    if (window.electronAPI) {
      window.electronAPI.thumbnailBase64(filePath, 200).then(b64 => {
        if (!cancelled) {
          if (b64) setSrc(b64);
          setLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [filePath]);

  return (
    <div className="aspect-square rounded-lg bg-surface-800 border border-surface-700 overflow-hidden relative group">
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-surface-600 border-t-lumora-500 rounded-full animate-spin" />
        </div>
      ) : src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-2xs text-surface-500 truncate px-1">{name}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-2xs text-white truncate block">{name}</span>
      </div>
    </div>
  );
};

export const ImportDialog: React.FC<ImportDialogProps> = ({ onClose }) => {
  const { addImages } = useAppStore();

  const [options, setOptions] = useState<ImportOptions>({
    source: 'files',
    buildPreviews: true,
    dontImportDuplicates: true,
    addToCollection: '',
    selectedFiles: [],
    previewImages: [],
  });

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  const handleSelectFiles = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFileDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images',
          extensions: [
            'jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp', 'webp', 'heic', 'heif',
            'raw', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2', 'dng', 'raf', 'pef',
          ],
        },
      ],
    });

    if (result && result.length > 0) {
      const previews = result.map((filePath: string) => ({
        path: filePath,
        name: filePath.split('/').pop() || filePath.split('\\').pop() || filePath,
        size: 0,
      }));
      setOptions((o) => ({
        ...o,
        selectedFiles: result,
        previewImages: previews,
        source: 'files',
      }));
    }
  };

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFolderDialog();
    if (result) {
      const files = await window.electronAPI.scanFolder(result);
      if (files && files.length > 0) {
        const previews = files.map((filePath: string) => ({
          path: filePath,
          name: filePath.split('/').pop() || filePath.split('\\').pop() || filePath,
          size: 0,
        }));
        setOptions((o) => ({
          ...o,
          selectedFiles: files,
          previewImages: previews,
          source: 'folder',
        }));
      }
    }
  };

  const handleImport = useCallback(async () => {
    if (!window.electronAPI || options.selectedFiles.length === 0) return;

    setIsImporting(true);
    setProgress(0);

    const total = options.selectedFiles.length;
    const importedImages: any[] = [];

    for (let i = 0; i < total; i++) {
      const filePath = options.selectedFiles[i];
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;

      setProgressText(`Importing ${fileName}...`);

      try {
        const result = await window.electronAPI.importImage(filePath, {
          buildPreviews: options.buildPreviews,
          skipDuplicates: options.dontImportDuplicates,
        });

        if (result) {
          importedImages.push(result);
        }
      } catch (err) {
        console.error(`Failed to import ${fileName}:`, err);
      }

      setProgress(((i + 1) / total) * 100);
    }

    if (importedImages.length > 0) {
      addImages(importedImages);
    }

    setProgressText(`Imported ${importedImages.length} of ${total} photos`);

    setTimeout(() => {
      setIsImporting(false);
      onClose();
    }, 800);
  }, [options, addImages, onClose]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col border border-panel-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border shrink-0">
          <h2 className="text-sm font-semibold text-surface-100">Import Photos</h2>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Source selection */}
        <div className="p-5 border-b border-panel-border shrink-0">
          <div className="flex gap-3">
            <button
              onClick={handleSelectFiles}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-surface-600 hover:border-lumora-500 hover:bg-lumora-600/5 transition-colors"
            >
              <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span className="text-xs text-surface-300">Select Files</span>
            </button>

            <button
              onClick={handleSelectFolder}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-surface-600 hover:border-lumora-500 hover:bg-lumora-600/5 transition-colors"
            >
              <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              <span className="text-xs text-surface-300">Select Folder</span>
            </button>
          </div>
        </div>

        {/* Preview grid */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {options.previewImages.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-surface-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <p className="text-sm text-surface-500">Select files or a folder to import</p>
              <p className="text-xs text-surface-600 mt-1">
                Supports RAW, JPEG, PNG, TIFF, HEIC, and more
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xs text-surface-400 mb-3">
                {options.previewImages.length} file{options.previewImages.length !== 1 ? 's' : ''} selected
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto">
                {options.previewImages.slice(0, 100).map((img, idx) => (
                  <ImportPreviewThumb key={idx} filePath={img.path} name={img.name} />
                ))}
              </div>
              {options.previewImages.length > 100 && (
                <p className="text-2xs text-surface-500 mt-2">
                  +{options.previewImages.length - 100} more files
                </p>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="px-5 py-3 border-t border-panel-border shrink-0 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.buildPreviews}
              onChange={(e) =>
                setOptions((o) => ({ ...o, buildPreviews: e.target.checked }))
              }
              className="rounded border-surface-600 bg-surface-800 text-lumora-500 focus:ring-lumora-500"
            />
            <span className="text-xs text-surface-300">Build Smart Previews</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.dontImportDuplicates}
              onChange={(e) =>
                setOptions((o) => ({ ...o, dontImportDuplicates: e.target.checked }))
              }
              className="rounded border-surface-600 bg-surface-800 text-lumora-500 focus:ring-lumora-500"
            />
            <span className="text-xs text-surface-300">Don't Import Suspected Duplicates</span>
          </label>
        </div>

        {/* Progress */}
        {isImporting && (
          <div className="px-5 py-3 border-t border-panel-border shrink-0">
            <div className="flex justify-between text-2xs text-surface-400 mb-1">
              <span>{progressText}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-lumora-500 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-panel-border shrink-0">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || options.selectedFiles.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting
              ? 'Importing...'
              : `Import ${options.selectedFiles.length || ''} Photo${options.selectedFiles.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};
