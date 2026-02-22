/**
 * Lumora Studio Pro — Application Store (Zustand)
 * 
 * Central state management for the entire application.
 * Handles current view, selected images, and UI state.
 */

import { create } from 'zustand';

/** Available application modules/views */
export type AppModule = 'library' | 'develop' | 'map' | 'export';

/** Image data from the catalog */
export interface CatalogImage {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  width: number;
  height: number;
  date_taken: string | null;
  date_imported: string;
  date_modified: string;
  camera_make: string | null;
  camera_model: string | null;
  lens: string | null;
  focal_length: number | null;
  aperture: number | null;
  shutter_speed: string | null;
  iso: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  rating: number;
  color_label: string;
  flag: string;
  keywords: string;
  caption: string;
  thumbnail_path: string;
  preview_path: string;
}

/** Application UI state */
interface AppState {
  // Current module/view
  currentModule: AppModule;
  setCurrentModule: (module: AppModule) => void;

  // Image catalog
  images: CatalogImage[];
  setImages: (images: CatalogImage[]) => void;
  addImages: (images: CatalogImage[]) => void;
  removeImages: (ids: string[]) => void;
  updateImage: (id: string, data: Partial<CatalogImage>) => void;

  // Selection
  selectedImageIds: string[];
  activeImageId: string | null;
  setSelectedImageIds: (ids: string[]) => void;
  setActiveImageId: (id: string | null) => void;
  toggleImageSelection: (id: string) => void;

  // UI panels
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  filmstripVisible: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  toggleFilmstrip: () => void;

  // View options
  gridSize: number;
  setGridSize: (size: number) => void;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  setSortBy: (field: string) => void;
  toggleSortDir: () => void;
  filterRating: number;
  filterFlag: string;
  setFilterRating: (rating: number) => void;
  setFilterFlag: (flag: string) => void;

  // Library view mode
  libraryViewMode: 'grid' | 'list';
  setLibraryViewMode: (mode: 'grid' | 'list') => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Before/After comparison
  showBeforeAfter: boolean;
  toggleBeforeAfter: () => void;

  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // Zoom
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Module
  currentModule: 'library',
  setCurrentModule: (module) => set({ currentModule: module }),

  // Images
  images: [],
  setImages: (images) => set({ images }),
  addImages: (newImages) => set((state) => ({ images: [...state.images, ...newImages] })),
  removeImages: (ids) => set((state) => ({
    images: state.images.filter((img) => !ids.includes(img.id)),
    selectedImageIds: state.selectedImageIds.filter((id) => !ids.includes(id)),
    activeImageId: ids.includes(state.activeImageId || '') ? null : state.activeImageId,
  })),
  updateImage: (id, data) => set((state) => ({
    images: state.images.map((img) => img.id === id ? { ...img, ...data } : img),
  })),

  // Selection
  selectedImageIds: [],
  activeImageId: null,
  setSelectedImageIds: (ids) => set({ selectedImageIds: ids }),
  setActiveImageId: (id) => set({ activeImageId: id, selectedImageIds: id ? [id] : [] }),
  toggleImageSelection: (id) => set((state) => {
    const isSelected = state.selectedImageIds.includes(id);
    return {
      selectedImageIds: isSelected
        ? state.selectedImageIds.filter((i) => i !== id)
        : [...state.selectedImageIds, id],
      activeImageId: isSelected ? state.selectedImageIds[0] || null : id,
    };
  }),

  // Panels
  leftPanelVisible: true,
  rightPanelVisible: true,
  leftPanelWidth: 260,
  rightPanelWidth: 300,
  filmstripVisible: true,
  toggleLeftPanel: () => set((state) => ({ leftPanelVisible: !state.leftPanelVisible })),
  toggleRightPanel: () => set((state) => ({ rightPanelVisible: !state.rightPanelVisible })),
  setLeftPanelWidth: (w) => set({ leftPanelWidth: Math.max(200, Math.min(400, w)) }),
  setRightPanelWidth: (w) => set({ rightPanelWidth: Math.max(250, Math.min(450, w)) }),
  toggleFilmstrip: () => set((state) => ({ filmstripVisible: !state.filmstripVisible })),

  // View options
  gridSize: 200,
  setGridSize: (size) => set({ gridSize: size }),
  sortBy: 'date_imported',
  sortDir: 'desc',
  setSortBy: (field) => set({ sortBy: field }),
  toggleSortDir: () => set((state) => ({ sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' })),
  filterRating: 0,
  filterFlag: '',
  setFilterRating: (rating) => set({ filterRating: rating }),
  setFilterFlag: (flag) => set({ filterFlag: flag }),

  // Library view
  libraryViewMode: 'grid',
  setLibraryViewMode: (mode) => set({ libraryViewMode: mode }),

  // Theme
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.documentElement.classList.toggle('light', newTheme === 'light');
    return { theme: newTheme };
  }),

  // Before/After
  showBeforeAfter: false,
  toggleBeforeAfter: () => set((state) => ({ showBeforeAfter: !state.showBeforeAfter })),

  // Loading
  isLoading: false,
  loadingMessage: '',
  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

  // Zoom 
  zoomLevel: 1,
  setZoomLevel: (level) => set({ zoomLevel: Math.max(0.1, Math.min(8, level)) }),
}));
