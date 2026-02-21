/**
 * Lumora Studio Pro — Preload Script
 * 
 * Exposes safe IPC bridge between renderer and main process.
 * Uses contextBridge for security isolation.
 */

import { contextBridge, ipcRenderer } from 'electron';

/** Exposed API for the renderer process */
const electronAPI = {
  // ─── File Operations ────────────────────────────────────────
  openFileDialog: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke('dialog:openFile', options),
  
  openFolderDialog: () =>
    ipcRenderer.invoke('dialog:openFolder'),

  saveFileDialog: (options?: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke('dialog:saveFile', options),

  readFile: (filePath: string) =>
    ipcRenderer.invoke('file:read', filePath),

  writeFile: (filePath: string, data: Buffer | string) =>
    ipcRenderer.invoke('file:write', filePath, data),

  getFileMetadata: (filePath: string) =>
    ipcRenderer.invoke('file:metadata', filePath),

  // ─── Image Processing ───────────────────────────────────────
  processImage: (filePath: string, operations: any) =>
    ipcRenderer.invoke('image:process', filePath, operations),

  generateThumbnail: (filePath: string, size: number) =>
    ipcRenderer.invoke('image:thumbnail', filePath, size),

  exportImage: (options: any) =>
    ipcRenderer.invoke('image:export', options),

  getImageInfo: (filePath: string) =>
    ipcRenderer.invoke('image:info', filePath),

  // ─── Catalog Operations ─────────────────────────────────────
  importImage: (filePath: string, options?: any) =>
    ipcRenderer.invoke('catalog:importSingle', filePath, options),

  scanFolder: (folderPath: string) =>
    ipcRenderer.invoke('catalog:scanFolder', folderPath),

  catalogImport: (filePaths: string[]) =>
    ipcRenderer.invoke('catalog:import', filePaths),

  catalogGetAll: (options?: any) =>
    ipcRenderer.invoke('catalog:getAll', options),

  catalogGetById: (id: string) =>
    ipcRenderer.invoke('catalog:getById', id),

  catalogUpdate: (id: string, data: any) =>
    ipcRenderer.invoke('catalog:update', id, data),

  catalogDelete: (ids: string[]) =>
    ipcRenderer.invoke('catalog:delete', ids),

  catalogSearch: (query: string) =>
    ipcRenderer.invoke('catalog:search', query),

  // ─── Edit Operations ────────────────────────────────────────
  saveEdits: (imageId: string, edits: any) =>
    ipcRenderer.invoke('edits:save', imageId, edits),

  loadEdits: (imageId: string) =>
    ipcRenderer.invoke('edits:load', imageId),

  getEditHistory: (imageId: string) =>
    ipcRenderer.invoke('edits:history', imageId),

  // ─── Presets ────────────────────────────────────────────────
  getPresets: () =>
    ipcRenderer.invoke('presets:getAll'),

  savePreset: (preset: any) =>
    ipcRenderer.invoke('presets:save', preset),

  deletePreset: (id: string) =>
    ipcRenderer.invoke('presets:delete', id),

  importPresets: (filePath: string) =>
    ipcRenderer.invoke('presets:import', filePath),

  exportPresets: (ids: string[], filePath: string) =>
    ipcRenderer.invoke('presets:export', ids, filePath),

  // ─── Collections ────────────────────────────────────────────
  getCollections: () =>
    ipcRenderer.invoke('collections:getAll'),

  createCollection: (name: string, type: string) =>
    ipcRenderer.invoke('collections:create', name, type),

  deleteCollection: (id: string) =>
    ipcRenderer.invoke('collections:delete', id),

  addToCollection: (collectionId: string, imageIds: string[]) =>
    ipcRenderer.invoke('collections:addImages', collectionId, imageIds),

  // ─── Application ────────────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  
  getPlatform: () => process.platform,

  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu:action', (_event, action) => callback(action));
    return () => ipcRenderer.removeAllListeners('menu:action');
  },

  // ─── Theme ──────────────────────────────────────────────────
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme: 'dark' | 'light' | 'system') => ipcRenderer.invoke('theme:set', theme),
};

// Expose in renderer via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declarations for the renderer
export type ElectronAPI = typeof electronAPI;
