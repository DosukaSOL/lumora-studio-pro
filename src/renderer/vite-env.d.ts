/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    openFileDialog: (options?: any) => Promise<string[] | null>;
    openFolderDialog: () => Promise<string | null>;
    saveFileDialog: (options?: any) => Promise<string | null>;
    readFile: (filePath: string) => Promise<Buffer>;
    writeFile: (filePath: string, data: Buffer | string) => Promise<boolean>;
    getFileMetadata: (filePath: string) => Promise<any>;
    processImage: (filePath: string, operations: any) => Promise<string>;
    generateThumbnail: (filePath: string, size: number) => Promise<string>;
    exportImage: (options: any) => Promise<string>;
    getImageInfo: (filePath: string) => Promise<any>;
    importImage: (filePath: string, options?: any) => Promise<any>;
    scanFolder: (folderPath: string) => Promise<string[]>;
    catalogImport: (filePaths: string[]) => Promise<string[]>;
    catalogGetAll: (options?: any) => Promise<any[]>;
    catalogGetById: (id: string) => Promise<any>;
    catalogUpdate: (id: string, data: any) => Promise<boolean>;
    catalogDelete: (ids: string[]) => Promise<boolean>;
    catalogSearch: (query: string) => Promise<any[]>;
    saveEdits: (imageId: string, edits: any) => Promise<string>;
    loadEdits: (imageId: string) => Promise<any>;
    getEditHistory: (imageId: string) => Promise<any[]>;
    getPresets: () => Promise<any[]>;
    savePreset: (preset: any) => Promise<string>;
    deletePreset: (id: string) => Promise<boolean>;
    importPresets: (filePath: string) => Promise<string[]>;
    exportPresets: (ids: string[], filePath: string) => Promise<boolean>;
    getCollections: () => Promise<any[]>;
    createCollection: (name: string, type: string) => Promise<string>;
    deleteCollection: (id: string) => Promise<boolean>;
    addToCollection: (collectionId: string, imageIds: string[]) => Promise<boolean>;
    getAppVersion: () => Promise<string>;
    getPlatform: () => string;
    onMenuAction: (callback: (action: string) => void) => () => void;
    getTheme: () => Promise<string>;
    setTheme: (theme: 'dark' | 'light' | 'system') => Promise<boolean>;
  };
}
