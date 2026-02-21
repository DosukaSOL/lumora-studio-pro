/**
 * Lumora Studio Pro — Edit Store (Zustand)
 * 
 * Manages all non-destructive editing parameters.
 * Each property corresponds to an edit slider or control.
 * Edits are stored as metadata and never modify the original image.
 */

import { create } from 'zustand';

/** Default values for all edit parameters */
export const DEFAULT_EDITS: EditState['edits'] = {
  // Basic
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,

  // Tone Curve
  toneCurve: {
    points: [
      { x: 0, y: 0 },
      { x: 64, y: 64 },
      { x: 128, y: 128 },
      { x: 192, y: 192 },
      { x: 255, y: 255 },
    ],
    channel: 'rgb' as 'rgb' | 'red' | 'green' | 'blue',
  },

  // HSL / Color Mixer
  hsl: {
    redHue: 0, orangeHue: 0, yellowHue: 0, greenHue: 0,
    aquaHue: 0, blueHue: 0, purpleHue: 0, magentaHue: 0,
    redSat: 0, orangeSat: 0, yellowSat: 0, greenSat: 0,
    aquaSat: 0, blueSat: 0, purpleSat: 0, magentaSat: 0,
    redLum: 0, orangeLum: 0, yellowLum: 0, greenLum: 0,
    aquaLum: 0, blueLum: 0, purpleLum: 0, magentaLum: 0,
  },

  // Color Grading
  colorGrading: {
    shadowsHue: 0, shadowsSat: 0,
    midtonesHue: 0, midtonesSat: 0,
    highlightsHue: 0, highlightsSat: 0,
    blending: 50,
    balance: 0,
  },

  // Detail
  sharpening: { amount: 0, radius: 1.0, detail: 25, masking: 0 },
  noiseReduction: { luminance: 0, color: 25 },

  // Optics
  lensCorrection: false,
  chromaticAberration: false,

  // Geometry
  uprightMode: 'off' as 'off' | 'auto' | 'level' | 'vertical' | 'full',
  transform: {
    distortion: 0,
    vertical: 0,
    horizontal: 0,
    rotate: 0,
    aspect: 0,
    scale: 0,
    xOffset: 0,
    yOffset: 0,
  },

  // Effects
  texture: 0,
  clarity: 0,
  dehaze: 0,
  vignette: { amount: 0, midpoint: 50, roundness: 0, feather: 50, highlights: 0 },
  grain: { amount: 0, size: 25, roughness: 50 },

  // Calibration
  calibration: {
    shadowsTint: 0,
    redPrimary: { hue: 0, saturation: 0 },
    greenPrimary: { hue: 0, saturation: 0 },
    bluePrimary: { hue: 0, saturation: 0 },
  },

  // Crop
  crop: { x: 0, y: 0, width: 0, height: 0, angle: 0, aspectRatio: 'original' },

  // White Balance preset
  whiteBalancePreset: 'as-shot',
};

/** Types for edit operations */
export interface ToneCurvePoint {
  x: number;
  y: number;
}

export interface EditParameters {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  toneCurve: {
    points: ToneCurvePoint[];
    channel: 'rgb' | 'red' | 'green' | 'blue';
  };
  hsl: Record<string, number>;
  colorGrading: Record<string, number>;
  sharpening: { amount: number; radius: number; detail: number; masking: number };
  noiseReduction: { luminance: number; color: number };
  lensCorrection: boolean;
  chromaticAberration: boolean;
  uprightMode: string;
  transform: Record<string, number>;
  texture: number;
  clarity: number;
  dehaze: number;
  vignette: Record<string, number>;
  grain: Record<string, number>;
  calibration: any;
  crop: { x: number; y: number; width: number; height: number; angle: number; aspectRatio: string };
  whiteBalancePreset: string;
}

/** History entry for undo/redo */
interface HistoryEntry {
  edits: EditParameters;
  description: string;
  timestamp: number;
}

interface EditState {
  edits: EditParameters;
  history: HistoryEntry[];
  historyIndex: number;
  isDirty: boolean;

  // Actions
  setEdit: (key: string, value: any) => void;
  setNestedEdit: (path: string[], value: any) => void;
  resetEdit: (key: string) => void;
  resetAllEdits: () => void;
  loadEdits: (edits: Partial<EditParameters>) => void;
  applyPreset: (presetData: Partial<EditParameters>) => void;

  // History
  pushHistory: (description: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistory: () => HistoryEntry[];
}

export const useEditStore = create<EditState>((set, get) => ({
  edits: { ...DEFAULT_EDITS } as EditParameters,
  history: [],
  historyIndex: -1,
  isDirty: false,

  setEdit: (key, value) => {
    set((state) => ({
      edits: { ...state.edits, [key]: value },
      isDirty: true,
    }));
  },

  setNestedEdit: (path, value) => {
    set((state) => {
      const newEdits = { ...state.edits };
      let current: any = newEdits;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return { edits: newEdits, isDirty: true };
    });
  },

  resetEdit: (key) => {
    const defaultValue = (DEFAULT_EDITS as any)[key];
    set((state) => ({
      edits: { ...state.edits, [key]: typeof defaultValue === 'object' ? { ...defaultValue } : defaultValue },
      isDirty: true,
    }));
  },

  resetAllEdits: () => {
    const state = get();
    state.pushHistory('Reset All');
    set({
      edits: JSON.parse(JSON.stringify(DEFAULT_EDITS)) as EditParameters,
      isDirty: false,
    });
  },

  loadEdits: (edits) => {
    set({
      edits: { ...DEFAULT_EDITS, ...edits } as EditParameters,
      isDirty: false,
      history: [],
      historyIndex: -1,
    });
  },

  applyPreset: (presetData) => {
    const state = get();
    state.pushHistory('Apply Preset');
    set((s) => ({
      edits: { ...s.edits, ...presetData },
      isDirty: true,
    }));
  },

  pushHistory: (description) => {
    set((state) => {
      const entry: HistoryEntry = {
        edits: JSON.parse(JSON.stringify(state.edits)),
        description,
        timestamp: Date.now(),
      };
      // Trim future history if we're not at the end
      const history = state.history.slice(0, state.historyIndex + 1);
      history.push(entry);
      // Keep max 100 history entries
      if (history.length > 100) history.shift();
      return {
        history,
        historyIndex: history.length - 1,
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex >= 0) {
      const entry = state.history[state.historyIndex];
      set({
        edits: JSON.parse(JSON.stringify(entry.edits)),
        historyIndex: state.historyIndex - 1,
        isDirty: true,
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const entry = state.history[state.historyIndex + 1];
      set({
        edits: JSON.parse(JSON.stringify(entry.edits)),
        historyIndex: state.historyIndex + 1,
        isDirty: true,
      });
    }
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  getHistory: () => get().history,
}));
