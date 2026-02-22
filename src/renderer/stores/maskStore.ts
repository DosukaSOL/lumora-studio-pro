/**
 * Lumora Studio Pro — Mask Store (Zustand)
 * 
 * Manages local adjustment masks: brush, linear gradient, radial gradient.
 * Each mask has its own set of adjustments (exposure, contrast, etc.)
 * that only apply to the masked region.
 */

import { create } from 'zustand';

export type MaskType = 'brush' | 'linearGradient' | 'radialGradient' | 'luminosity';

export interface MaskAdjustments {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  clarity: number;
  dehaze: number;
  saturation: number;
  sharpness: number;
  noiseReduction: number;
}

export const DEFAULT_MASK_ADJUSTMENTS: MaskAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  clarity: 0,
  dehaze: 0,
  saturation: 0,
  sharpness: 0,
  noiseReduction: 0,
};

export interface BrushSettings {
  size: number;
  feather: number;
  flow: number;
  density: number;
  autoMask: boolean;
}

export interface LinearGradientData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface RadialGradientData {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  feather: number;
  invert: boolean;
}

export interface LuminosityData {
  range: 'highlights' | 'midtones' | 'shadows';
  threshold: number;
  feather: number;
}

export interface BrushStroke {
  points: Array<{ x: number; y: number; pressure: number }>;
  size: number;
  feather: number;
  flow: number;
  erase: boolean;
}

export interface Mask {
  id: string;
  name: string;
  type: MaskType;
  enabled: boolean;
  opacity: number;
  adjustments: MaskAdjustments;
  brushStrokes?: BrushStroke[];
  brushSettings?: BrushSettings;
  linearGradient?: LinearGradientData;
  radialGradient?: RadialGradientData;
  luminosity?: LuminosityData;
}

export interface MaskPreset {
  id: string;
  name: string;
  category: string;
  type: MaskType;
  adjustments: MaskAdjustments;
  isBuiltIn: boolean;
}

/** Built-in mask presets */
export const BUILT_IN_MASK_PRESETS: MaskPreset[] = [
  {
    id: 'mp-1', name: 'Dodge (Lighten)', category: 'Exposure',
    type: 'brush', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, exposure: 0.8, shadows: 25 },
  },
  {
    id: 'mp-2', name: 'Burn (Darken)', category: 'Exposure',
    type: 'brush', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, exposure: -0.8, highlights: -25 },
  },
  {
    id: 'mp-3', name: 'Soften Skin', category: 'Portrait',
    type: 'brush', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, clarity: -40, sharpness: -20, noiseReduction: 30 },
  },
  {
    id: 'mp-4', name: 'Enhance Eyes', category: 'Portrait',
    type: 'brush', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, exposure: 0.3, clarity: 25, saturation: 15, sharpness: 30 },
  },
  {
    id: 'mp-5', name: 'Whiten Teeth', category: 'Portrait',
    type: 'brush', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, exposure: 0.3, saturation: -40 },
  },
  {
    id: 'mp-6', name: 'Darken Sky', category: 'Landscape',
    type: 'linearGradient', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, exposure: -0.6, contrast: 15, saturation: 20, highlights: -30 },
  },
  {
    id: 'mp-7', name: 'Brighten Foreground', category: 'Landscape',
    type: 'linearGradient', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, exposure: 0.5, shadows: 30, clarity: 10 },
  },
  {
    id: 'mp-8', name: 'Spotlight', category: 'Creative',
    type: 'radialGradient', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, exposure: -1.0, contrast: -10 },
  },
  {
    id: 'mp-9', name: 'Soft Vignette', category: 'Creative',
    type: 'radialGradient', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, exposure: -0.5, highlights: -15 },
  },
  {
    id: 'mp-10', name: 'Warm Glow', category: 'Creative',
    type: 'radialGradient', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, temperature: 30, exposure: 0.3, contrast: -10 },
  },
  {
    id: 'mp-11', name: 'Cool Shadow', category: 'Creative',
    type: 'brush', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, temperature: -25, exposure: -0.4, contrast: 10 },
  },
  {
    id: 'mp-12', name: 'Enhance Highlights', category: 'Exposure',
    type: 'luminosity', isBuiltIn: true,
    adjustments: { ...DEFAULT_MASK_ADJUSTMENTS, highlights: 30, whites: 15, contrast: 10 },
  },
];

interface MaskState {
  masks: Mask[];
  activeMaskId: string | null;
  activeTool: MaskType | null;
  isDrawing: boolean;
  showMaskOverlay: boolean;
  brushSettings: BrushSettings;
  maskPresets: MaskPreset[];

  // Actions  
  addMask: (type: MaskType, name?: string) => string;
  removeMask: (id: string) => void;
  duplicateMask: (id: string) => void;
  updateMask: (id: string, updates: Partial<Mask>) => void;
  setMaskAdjustment: (id: string, key: keyof MaskAdjustments, value: number) => void;
  resetMaskAdjustments: (id: string) => void;
  setActiveMask: (id: string | null) => void;
  setActiveTool: (tool: MaskType | null) => void;
  toggleMaskEnabled: (id: string) => void;
  setMaskOpacity: (id: string, opacity: number) => void;
  renameMask: (id: string, name: string) => void;
  setIsDrawing: (drawing: boolean) => void;
  toggleMaskOverlay: () => void;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
  addBrushStroke: (maskId: string, stroke: BrushStroke) => void;
  applyMaskPreset: (maskId: string, preset: MaskPreset) => void;
  clearAllMasks: () => void;
}

let maskIdCounter = 0;
const generateMaskId = () => `mask-${Date.now()}-${++maskIdCounter}`;

export const useMaskStore = create<MaskState>((set, get) => ({
  masks: [],
  activeMaskId: null,
  activeTool: null,
  isDrawing: false,
  showMaskOverlay: false,
  brushSettings: {
    size: 50,
    feather: 50,
    flow: 75,
    density: 100,
    autoMask: false,
  },
  maskPresets: [...BUILT_IN_MASK_PRESETS],

  addMask: (type, name) => {
    const id = generateMaskId();
    const maskCount = get().masks.length + 1;
    const defaultName = name || `${type === 'brush' ? 'Brush' : type === 'linearGradient' ? 'Linear Gradient' : type === 'radialGradient' ? 'Radial Gradient' : 'Luminosity'} ${maskCount}`;

    const mask: Mask = {
      id,
      name: defaultName,
      type,
      enabled: true,
      opacity: 100,
      adjustments: { ...DEFAULT_MASK_ADJUSTMENTS },
      ...(type === 'brush' && {
        brushStrokes: [],
        brushSettings: { ...get().brushSettings },
      }),
      ...(type === 'linearGradient' && {
        linearGradient: { startX: 0.5, startY: 0, endX: 0.5, endY: 0.5 },
      }),
      ...(type === 'radialGradient' && {
        radialGradient: { centerX: 0.5, centerY: 0.5, radiusX: 0.3, radiusY: 0.3, feather: 50, invert: true },
      }),
      ...(type === 'luminosity' && {
        luminosity: { range: 'highlights', threshold: 50, feather: 25 },
      }),
    };

    set((state) => ({
      masks: [...state.masks, mask],
      activeMaskId: id,
      activeTool: type,
    }));

    return id;
  },

  removeMask: (id) => {
    set((state) => ({
      masks: state.masks.filter((m) => m.id !== id),
      activeMaskId: state.activeMaskId === id ? null : state.activeMaskId,
    }));
  },

  duplicateMask: (id) => {
    const mask = get().masks.find((m) => m.id === id);
    if (!mask) return;
    const newId = generateMaskId();
    set((state) => ({
      masks: [...state.masks, { ...JSON.parse(JSON.stringify(mask)), id: newId, name: `${mask.name} (Copy)` }],
      activeMaskId: newId,
    }));
  },

  updateMask: (id, updates) => {
    set((state) => ({
      masks: state.masks.map((m) => m.id === id ? { ...m, ...updates } : m),
    }));
  },

  setMaskAdjustment: (id, key, value) => {
    set((state) => ({
      masks: state.masks.map((m) =>
        m.id === id ? { ...m, adjustments: { ...m.adjustments, [key]: value } } : m
      ),
    }));
  },

  resetMaskAdjustments: (id) => {
    set((state) => ({
      masks: state.masks.map((m) =>
        m.id === id ? { ...m, adjustments: { ...DEFAULT_MASK_ADJUSTMENTS } } : m
      ),
    }));
  },

  setActiveMask: (id) => set({ activeMaskId: id }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleMaskEnabled: (id) => {
    set((state) => ({
      masks: state.masks.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m),
    }));
  },
  setMaskOpacity: (id, opacity) => {
    set((state) => ({
      masks: state.masks.map((m) => m.id === id ? { ...m, opacity } : m),
    }));
  },
  renameMask: (id, name) => {
    set((state) => ({
      masks: state.masks.map((m) => m.id === id ? { ...m, name } : m),
    }));
  },
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  toggleMaskOverlay: () => set((state) => ({ showMaskOverlay: !state.showMaskOverlay })),
  setBrushSettings: (settings) => set((state) => ({
    brushSettings: { ...state.brushSettings, ...settings },
  })),
  addBrushStroke: (maskId, stroke) => {
    set((state) => ({
      masks: state.masks.map((m) =>
        m.id === maskId ? { ...m, brushStrokes: [...(m.brushStrokes || []), stroke] } : m
      ),
    }));
  },
  applyMaskPreset: (maskId, preset) => {
    set((state) => ({
      masks: state.masks.map((m) =>
        m.id === maskId ? { ...m, adjustments: { ...preset.adjustments } } : m
      ),
    }));
  },
  clearAllMasks: () => set({ masks: [], activeMaskId: null, activeTool: null }),
}));
