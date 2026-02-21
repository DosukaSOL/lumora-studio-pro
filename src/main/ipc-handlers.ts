/**
 * Lumora Studio Pro — IPC Handlers
 * 
 * Bridges communication between the Electron renderer process
 * and the main process / native system APIs.
 */

import { ipcMain, dialog, app, nativeTheme, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { CatalogDatabase } from './database';
import { ImageProcessor } from './image-processor';

const imageProcessor = new ImageProcessor();

export function setupIpcHandlers(db: CatalogDatabase): void {

  // ─── File Dialog Operations ───────────────────────────────────

  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: options?.filters || [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf', 'rw2'] },
        { name: 'RAW Files', extensions: ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf', 'rw2'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths;
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (_event, options) => {
    const result = await dialog.showSaveDialog({
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        { name: 'PNG', extensions: ['png'] },
        { name: 'TIFF', extensions: ['tiff', 'tif'] },
      ],
    });
    return result.canceled ? null : result.filePath;
  });

  // ─── File Operations ──────────────────────────────────────────

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    const data = await fs.readFile(filePath);
    return data;
  });

  ipcMain.handle('file:write', async (_event, filePath: string, data: Buffer | string) => {
    await fs.writeFile(filePath, data);
    return true;
  });

  ipcMain.handle('file:metadata', async (_event, filePath: string) => {
    const stat = await fs.stat(filePath);
    return {
      size: stat.size,
      created: stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
      isFile: stat.isFile(),
    };
  });

  // ─── Image Processing ─────────────────────────────────────────

  ipcMain.handle('image:process', async (_event, filePath: string, operations: any) => {
    return await imageProcessor.processImage(filePath, operations);
  });

  ipcMain.handle('image:thumbnail', async (_event, filePath: string, size: number) => {
    return await imageProcessor.generateThumbnail(filePath, size);
  });

  ipcMain.handle('image:export', async (_event, options: any) => {
    return await imageProcessor.exportImage(options);
  });

  ipcMain.handle('image:info', async (_event, filePath: string) => {
    return await imageProcessor.getImageInfo(filePath);
  });

  // ─── Catalog Operations ────────────────────────────────────────

  ipcMain.handle('catalog:import', async (_event, filePaths: string[]) => {
    const imported: string[] = [];
    for (const filePath of filePaths) {
      try {
        const info = await imageProcessor.getImageInfo(filePath);
        const thumbnail = await imageProcessor.generateThumbnail(filePath, 300);
        
        const id = db.importImage({
          filePath,
          fileName: path.basename(filePath),
          fileSize: info.size,
          fileType: path.extname(filePath).toLowerCase().replace('.', ''),
          width: info.width,
          height: info.height,
          dateTaken: info.dateTaken,
          cameraMake: info.cameraMake,
          cameraModel: info.cameraModel,
          lens: info.lens,
          focalLength: info.focalLength,
          aperture: info.aperture,
          shutterSpeed: info.shutterSpeed,
          iso: info.iso,
          gpsLat: info.gpsLat,
          gpsLng: info.gpsLng,
          thumbnailPath: thumbnail,
          previewPath: thumbnail,
        });
        imported.push(id);
      } catch (err) {
        console.error(`Failed to import ${filePath}:`, err);
      }
    }
    return imported;
  });

  ipcMain.handle('catalog:importSingle', async (_event, filePath: string, _options?: any) => {
    try {
      const info = await imageProcessor.getImageInfo(filePath);
      const thumbnail = await imageProcessor.generateThumbnail(filePath, 300);
      const id = db.importImage({
        filePath,
        fileName: path.basename(filePath),
        fileSize: info.size,
        fileType: path.extname(filePath).toLowerCase().replace('.', ''),
        width: info.width,
        height: info.height,
        dateTaken: info.dateTaken,
        cameraMake: info.cameraMake,
        cameraModel: info.cameraModel,
        lens: info.lens,
        focalLength: info.focalLength,
        aperture: info.aperture,
        shutterSpeed: info.shutterSpeed,
        iso: info.iso,
        gpsLat: info.gpsLat,
        gpsLng: info.gpsLng,
        thumbnailPath: thumbnail,
        previewPath: thumbnail,
      });
      return db.getImageById(id);
    } catch (err) {
      console.error(`Failed to import ${filePath}:`, err);
      return null;
    }
  });

  ipcMain.handle('catalog:scanFolder', async (_event, folderPath: string) => {
    const imageExtensions = new Set([
      '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp', '.heic', '.heif',
      '.raw', '.cr2', '.cr3', '.nef', '.arw', '.orf', '.rw2', '.dng', '.raf', '.pef',
    ]);
    const results: string[] = [];
    async function scan(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scan(fullPath);
        } else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
          results.push(fullPath);
        }
      }
    }
    await scan(folderPath);
    return results;
  });

  ipcMain.handle('catalog:getAll', async (_event, options) => {
    return db.getAllImages(options);
  });

  ipcMain.handle('catalog:getById', async (_event, id: string) => {
    return db.getImageById(id);
  });

  ipcMain.handle('catalog:update', async (_event, id: string, data: any) => {
    db.updateImage(id, data);
    return true;
  });

  ipcMain.handle('catalog:delete', async (_event, ids: string[]) => {
    db.deleteImages(ids);
    return true;
  });

  ipcMain.handle('catalog:search', async (_event, query: string) => {
    return db.searchImages(query);
  });

  // ─── Edit Operations ──────────────────────────────────────────

  ipcMain.handle('edits:save', async (_event, imageId: string, edits: any) => {
    const id = db.saveEdits(imageId, edits);
    db.addEditHistory(imageId, edits, edits._description || 'Edit');
    return id;
  });

  ipcMain.handle('edits:load', async (_event, imageId: string) => {
    return db.loadCurrentEdits(imageId);
  });

  ipcMain.handle('edits:history', async (_event, imageId: string) => {
    return db.getEditHistory(imageId);
  });

  // ─── Preset Operations ────────────────────────────────────────

  ipcMain.handle('presets:getAll', async () => {
    return db.getAllPresets();
  });

  ipcMain.handle('presets:save', async (_event, preset: any) => {
    return db.savePreset(preset);
  });

  ipcMain.handle('presets:delete', async (_event, id: string) => {
    db.deletePreset(id);
    return true;
  });

  ipcMain.handle('presets:import', async (_event, filePath: string) => {
    const data = await fs.readFile(filePath, 'utf-8');
    const presets = JSON.parse(data);
    const ids: string[] = [];
    for (const preset of presets) {
      ids.push(db.savePreset(preset));
    }
    return ids;
  });

  ipcMain.handle('presets:export', async (_event, ids: string[], filePath: string) => {
    const allPresets = db.getAllPresets();
    const toExport = allPresets.filter(p => ids.includes(p.id));
    await fs.writeFile(filePath, JSON.stringify(toExport, null, 2));
    return true;
  });

  // ─── Collection Operations ────────────────────────────────────

  ipcMain.handle('collections:getAll', async () => {
    return db.getAllCollections();
  });

  ipcMain.handle('collections:create', async (_event, name: string, type: string) => {
    return db.createCollection(name, type);
  });

  ipcMain.handle('collections:delete', async (_event, id: string) => {
    db.deleteCollection(id);
    return true;
  });

  ipcMain.handle('collections:addImages', async (_event, collectionId: string, imageIds: string[]) => {
    db.addImagesToCollection(collectionId, imageIds);
    return true;
  });

  // ─── Application ──────────────────────────────────────────────

  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

  ipcMain.handle('theme:set', (_event, theme: string) => {
    nativeTheme.themeSource = theme as 'dark' | 'light' | 'system';
    return true;
  });
}
