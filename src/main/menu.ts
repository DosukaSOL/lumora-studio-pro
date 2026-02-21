/**
 * Lumora Studio Pro — Application Menu
 * 
 * Creates the native system menu bar with all standard 
 * photo editing application menu items.
 */

import { BrowserWindow, Menu, MenuItemConstructorOptions, app, dialog, shell } from 'electron';

/**
 * Sends a menu action to the renderer process
 */
function sendMenuAction(win: BrowserWindow | null, action: string): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send('menu:action', action);
  }
}

/**
 * Build the full application menu
 */
export function createApplicationMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const, label: 'About Lumora Studio Pro' },
        { type: 'separator' as const },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => sendMenuAction(mainWindow, 'preferences'),
        },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Photos...',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => sendMenuAction(mainWindow, 'import'),
        },
        {
          label: 'Import Folder...',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendMenuAction(mainWindow, 'importFolder'),
        },
        { type: 'separator' },
        {
          label: 'Export...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => sendMenuAction(mainWindow, 'export'),
        },
        {
          label: 'Export with Previous Settings',
          accelerator: 'CmdOrCtrl+Alt+Shift+E',
          click: () => sendMenuAction(mainWindow, 'exportPrevious'),
        },
        { type: 'separator' },
        {
          label: 'New Catalog...',
          click: () => sendMenuAction(mainWindow, 'newCatalog'),
        },
        {
          label: 'Open Catalog...',
          click: () => sendMenuAction(mainWindow, 'openCatalog'),
        },
        { type: 'separator' },
        ...(isMac ? [] : [
          { type: 'separator' as const },
          { role: 'quit' as const },
        ]),
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendMenuAction(mainWindow, 'undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => sendMenuAction(mainWindow, 'redo'),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Select All Photos',
          accelerator: 'CmdOrCtrl+A',
          click: () => sendMenuAction(mainWindow, 'selectAll'),
        },
        {
          label: 'Deselect All',
          accelerator: 'CmdOrCtrl+D',
          click: () => sendMenuAction(mainWindow, 'deselectAll'),
        },
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Library',
          accelerator: 'CmdOrCtrl+Alt+1',
          click: () => sendMenuAction(mainWindow, 'viewLibrary'),
        },
        {
          label: 'Develop',
          accelerator: 'CmdOrCtrl+Alt+2',
          click: () => sendMenuAction(mainWindow, 'viewDevelop'),
        },
        {
          label: 'Map',
          accelerator: 'CmdOrCtrl+Alt+3',
          click: () => sendMenuAction(mainWindow, 'viewMap'),
        },
        { type: 'separator' },
        {
          label: 'Before / After',
          accelerator: '\\',
          click: () => sendMenuAction(mainWindow, 'beforeAfter'),
        },
        {
          label: 'Zoom to Fit',
          accelerator: 'CmdOrCtrl+0',
          click: () => sendMenuAction(mainWindow, 'zoomFit'),
        },
        {
          label: 'Zoom to 100%',
          accelerator: 'CmdOrCtrl+1',
          click: () => sendMenuAction(mainWindow, 'zoom100'),
        },
        { type: 'separator' },
        {
          label: 'Show Navigator',
          click: () => sendMenuAction(mainWindow, 'toggleNavigator'),
          type: 'checkbox',
          checked: true,
        },
        {
          label: 'Show Histogram',
          click: () => sendMenuAction(mainWindow, 'toggleHistogram'),
          type: 'checkbox',
          checked: true,
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },

    // Photo Menu
    {
      label: 'Photo',
      submenu: [
        {
          label: 'Auto Tone',
          accelerator: 'CmdOrCtrl+U',
          click: () => sendMenuAction(mainWindow, 'autoTone'),
        },
        {
          label: 'Auto White Balance',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => sendMenuAction(mainWindow, 'autoWB'),
        },
        { type: 'separator' },
        {
          label: 'Reset All Settings',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => sendMenuAction(mainWindow, 'resetAll'),
        },
        {
          label: 'Copy Settings',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => sendMenuAction(mainWindow, 'copySettings'),
        },
        {
          label: 'Paste Settings',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => sendMenuAction(mainWindow, 'pasteSettings'),
        },
        { type: 'separator' },
        {
          label: 'Set Rating',
          submenu: [
            { label: '★★★★★', accelerator: '5', click: () => sendMenuAction(mainWindow, 'rate:5') },
            { label: '★★★★', accelerator: '4', click: () => sendMenuAction(mainWindow, 'rate:4') },
            { label: '★★★', accelerator: '3', click: () => sendMenuAction(mainWindow, 'rate:3') },
            { label: '★★', accelerator: '2', click: () => sendMenuAction(mainWindow, 'rate:2') },
            { label: '★', accelerator: '1', click: () => sendMenuAction(mainWindow, 'rate:1') },
            { label: 'No Rating', accelerator: '0', click: () => sendMenuAction(mainWindow, 'rate:0') },
          ],
        },
        {
          label: 'Set Color Label',
          submenu: [
            { label: 'Red', accelerator: '6', click: () => sendMenuAction(mainWindow, 'label:red') },
            { label: 'Yellow', accelerator: '7', click: () => sendMenuAction(mainWindow, 'label:yellow') },
            { label: 'Green', accelerator: '8', click: () => sendMenuAction(mainWindow, 'label:green') },
            { label: 'Blue', accelerator: '9', click: () => sendMenuAction(mainWindow, 'label:blue') },
            { label: 'None', click: () => sendMenuAction(mainWindow, 'label:none') },
          ],
        },
        { type: 'separator' },
        {
          label: 'Flag as Pick',
          accelerator: 'P',
          click: () => sendMenuAction(mainWindow, 'flagPick'),
        },
        {
          label: 'Flag as Reject',
          accelerator: 'X',
          click: () => sendMenuAction(mainWindow, 'flagReject'),
        },
        {
          label: 'Remove Flag',
          accelerator: 'U',
          click: () => sendMenuAction(mainWindow, 'flagRemove'),
        },
      ],
    },

    // Metadata Menu
    {
      label: 'Metadata',
      submenu: [
        {
          label: 'Edit Metadata...',
          click: () => sendMenuAction(mainWindow, 'editMetadata'),
        },
        {
          label: 'Add Keywords...',
          accelerator: 'CmdOrCtrl+K',
          click: () => sendMenuAction(mainWindow, 'addKeywords'),
        },
        { type: 'separator' },
        {
          label: 'Read Metadata from File',
          click: () => sendMenuAction(mainWindow, 'readMetadata'),
        },
        {
          label: 'Save Metadata to File',
          click: () => sendMenuAction(mainWindow, 'saveMetadata'),
        },
      ],
    },

    // Help Menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://lumora.studio/docs'),
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => sendMenuAction(mainWindow, 'shortcuts'),
        },
        { type: 'separator' },
        {
          label: 'Report Issue...',
          click: () => shell.openExternal('https://github.com/lumora/studio-pro/issues'),
        },
        { type: 'separator' },
        {
          label: 'About Lumora Studio Pro',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Lumora Studio Pro',
              message: 'Lumora Studio Pro',
              detail: `Version ${app.getVersion()}\n\nProfessional RAW photo editor and asset manager.\n\n© 2026 Lumora Studio Team`,
            });
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
