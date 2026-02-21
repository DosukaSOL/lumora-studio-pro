/**
 * Lumora Studio Pro — Electron Main Process
 * 
 * This is the entry point for the Electron application.
 * It handles window creation, native menus, IPC communication,
 * and bridges between the renderer and system-level operations.
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeTheme } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc-handlers';
import { createApplicationMenu } from './menu';
import { CatalogDatabase } from './database';

// Globals
let mainWindow: BrowserWindow | null = null;
let catalogDb: CatalogDatabase | null = null;

const isDev = !app.isPackaged;

/**
 * Create the main application window
 */
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    title: 'Lumora Studio Pro',
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webgl: true,
      backgroundThrottling: false,
    },
    show: false,
    icon: path.join(__dirname, '../../resources/icon.png'),
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Application initialization
 */
app.whenReady().then(async () => {
  // Initialize the catalog database
  const dbPath = path.join(app.getPath('userData'), 'lumora-catalog.db');
  catalogDb = new CatalogDatabase(dbPath);

  // Create the main window
  createMainWindow();

  // Set up application menu
  const menu = createApplicationMenu(mainWindow!);
  Menu.setApplicationMenu(menu);

  // Set up IPC handlers for renderer communication
  setupIpcHandlers(catalogDb);

  // macOS: re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  catalogDb?.close();
});

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
