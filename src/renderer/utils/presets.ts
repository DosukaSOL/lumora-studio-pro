/**
 * Lumora Studio Pro — Presets Library
 * 
 * Comprehensive collection of built-in presets organized by category.
 * Each preset contains partial EditParameters that get merged with current edits.
 */

import { EditParameters } from '../stores/editStore';

export interface Preset {
  id: string;
  name: string;
  category: string;
  description: string;
  edit_data: Partial<EditParameters>;
  isBuiltIn: boolean;
  icon?: string;
}

export const PRESET_CATEGORIES = [
  'Favorites',
  'Auto',
  'Color',
  'B&W',
  'Portrait',
  'Landscape',
  'Street',
  'Film',
  'Creative',
  'Cinematic',
  'Vintage',
  'User',
] as const;

export const BUILT_IN_PRESETS: Preset[] = [
  // === Auto ===
  {
    id: 'p-auto-tone', name: 'Auto Tone', category: 'Auto',
    description: 'Automatically optimize exposure, contrast, and tonal balance',
    isBuiltIn: true,
    edit_data: { exposure: 0.15, contrast: 12, highlights: -20, shadows: 25, whites: 10, blacks: -8 },
  },
  {
    id: 'p-auto-wb', name: 'Auto White Balance', category: 'Auto',
    description: 'Correct white balance for neutral tones',
    isBuiltIn: true,
    edit_data: { temperature: 0, tint: 0, whiteBalancePreset: 'auto' },
  },
  
  // === Color ===
  {
    id: 'p-vivid', name: 'Vivid', category: 'Color',
    description: 'Bold, saturated colors for maximum impact',
    isBuiltIn: true,
    edit_data: { vibrance: 45, saturation: 20, contrast: 15, clarity: 10, dehaze: 5 },
  },
  {
    id: 'p-warm-sunset', name: 'Warm Sunset', category: 'Color',
    description: 'Golden hour warmth with rich orange tones',
    isBuiltIn: true,
    edit_data: { temperature: 900, tint: 10, vibrance: 25, saturation: 10, highlights: -10, contrast: 8 },
  },
  {
    id: 'p-cool-tones', name: 'Cool Tones', category: 'Color',
    description: 'Cooler temperature with blue-tinted shadows',
    isBuiltIn: true,
    edit_data: { temperature: -400, tint: -5, vibrance: 15, contrast: 10, shadows: 10 },
  },
  {
    id: 'p-golden-hour', name: 'Golden Hour', category: 'Color',
    description: 'Warm, dreamy golden-hour look',
    isBuiltIn: true,
    edit_data: { temperature: 700, tint: 5, exposure: 0.1, vibrance: 20, contrast: -5, highlights: -15 },
  },
  {
    id: 'p-teal-orange', name: 'Teal & Orange', category: 'Color',
    description: 'Hollywood-style complementary color grading',
    isBuiltIn: true,
    edit_data: { temperature: 200, vibrance: 30, saturation: 5, contrast: 15 },
  },
  {
    id: 'p-pastel', name: 'Pastel', category: 'Color',
    description: 'Soft, muted pastel colors',
    isBuiltIn: true,
    edit_data: { saturation: -25, vibrance: 15, contrast: -15, highlights: 10, shadows: 20, blacks: 20 },
  },
  
  // === Black & White ===
  {
    id: 'p-bw-classic', name: 'Classic B&W', category: 'B&W',
    description: 'Timeless black and white conversion',
    isBuiltIn: true,
    edit_data: { saturation: -100, contrast: 25, clarity: 15 },
  },
  {
    id: 'p-bw-high-contrast', name: 'High Contrast B&W', category: 'B&W',
    description: 'Dramatic black and white with deep shadows',
    isBuiltIn: true,
    edit_data: { saturation: -100, contrast: 55, blacks: -20, whites: 25, clarity: 30 },
  },
  {
    id: 'p-bw-soft', name: 'Soft B&W', category: 'B&W',
    description: 'Gentle, low-contrast black and white',
    isBuiltIn: true,
    edit_data: { saturation: -100, contrast: -10, shadows: 30, blacks: 25, clarity: -10 },
  },
  {
    id: 'p-bw-selenium', name: 'Selenium Tone', category: 'B&W',
    description: 'B&W with subtle warm selenium tone',
    isBuiltIn: true,
    edit_data: { saturation: -85, temperature: 200, tint: 5, contrast: 20, clarity: 10 },
  },
  {
    id: 'p-bw-noir', name: 'Film Noir', category: 'B&W',
    description: 'Dark, moody film noir look',
    isBuiltIn: true,
    edit_data: { saturation: -100, contrast: 45, exposure: -0.3, whites: 30, blacks: -30, clarity: 25 },
  },
  
  // === Portrait ===
  {
    id: 'p-soft-portrait', name: 'Soft Portrait', category: 'Portrait',
    description: 'Flattering soft light for portraits',
    isBuiltIn: true,
    edit_data: { clarity: -15, shadows: 25, highlights: -10, vibrance: 10, contrast: -5 },
  },
  {
    id: 'p-studio-light', name: 'Studio Light', category: 'Portrait',
    description: 'Clean studio photography look',
    isBuiltIn: true,
    edit_data: { exposure: 0.2, contrast: 10, highlights: -15, whites: 15, clarity: 5, vibrance: 10 },
  },
  {
    id: 'p-moody-portrait', name: 'Moody Portrait', category: 'Portrait',
    description: 'Dark, atmospheric portrait style',
    isBuiltIn: true,
    edit_data: { exposure: -0.3, contrast: 20, shadows: -10, blacks: -15, clarity: 15, vibrance: -10, dehaze: 10 },
  },
  {
    id: 'p-bright-airy', name: 'Bright & Airy', category: 'Portrait',
    description: 'Light, bright look popular for lifestyle photography',
    isBuiltIn: true,
    edit_data: { exposure: 0.4, contrast: -10, highlights: -20, shadows: 40, blacks: 15, vibrance: 10, clarity: -5 },
  },
  
  // === Landscape ===
  {
    id: 'p-landscape-pop', name: 'Landscape Pop', category: 'Landscape',
    description: 'Punchy landscape with enhanced colors and detail',
    isBuiltIn: true,
    edit_data: { clarity: 30, vibrance: 35, contrast: 15, highlights: -25, shadows: 20, dehaze: 15 },
  },
  {
    id: 'p-epic-nature', name: 'Epic Nature', category: 'Landscape',
    description: 'Dramatic landscape processing',
    isBuiltIn: true,
    edit_data: { clarity: 40, contrast: 25, vibrance: 30, highlights: -40, shadows: 30, whites: 10, blacks: -10, dehaze: 20 },
  },
  {
    id: 'p-misty-morning', name: 'Misty Morning', category: 'Landscape',
    description: 'Soft, atmospheric landscape feel',
    isBuiltIn: true,
    edit_data: { contrast: -15, clarity: -10, dehaze: -20, temperature: 200, shadows: 25, vibrance: 10 },
  },
  
  // === Street Photography ===
  {
    id: 'p-street-grit', name: 'Street Grit', category: 'Street',
    description: 'Gritty urban street photography look',
    isBuiltIn: true,
    edit_data: { contrast: 30, clarity: 35, dehaze: 10, vibrance: -10, saturation: -5 },
  },
  {
    id: 'p-urban-fade', name: 'Urban Fade', category: 'Street',
    description: 'Faded, lifted blacks for urban photography',
    isBuiltIn: true,
    edit_data: { contrast: 10, blacks: 30, shadows: 15, vibrance: -5, clarity: 10 },
  },
  
  // === Film Emulation ===
  {
    id: 'p-film-portra', name: 'Film Portra', category: 'Film',
    description: 'Inspired by Kodak Portra film stock',
    isBuiltIn: true,
    edit_data: { contrast: -8, highlights: -10, shadows: 15, vibrance: 12, clarity: -5, temperature: 200, blacks: 8 },
  },
  {
    id: 'p-film-fuji', name: 'Film Fuji', category: 'Film',
    description: 'Inspired by Fujifilm classic stocks',
    isBuiltIn: true,
    edit_data: { contrast: 10, vibrance: 20, saturation: 5, temperature: -100, clarity: 5, blacks: 5 },
  },
  {
    id: 'p-film-tri-x', name: 'Film Tri-X', category: 'Film',
    description: 'Classic Kodak Tri-X pushed black and white film',
    isBuiltIn: true,
    edit_data: { saturation: -100, contrast: 35, clarity: 20, blacks: -10, whites: 15 },
  },
  {
    id: 'p-film-velvia', name: 'Film Velvia', category: 'Film',
    description: 'Highly saturated Fuji Velvia landscape film',
    isBuiltIn: true,
    edit_data: { saturation: 25, vibrance: 30, contrast: 25, clarity: 15, blacks: -10 },
  },
  {
    id: 'p-film-ektar', name: 'Film Ektar', category: 'Film',
    description: 'Vivid Kodak Ektar color film',
    isBuiltIn: true,
    edit_data: { saturation: 20, vibrance: 25, contrast: 15, blacks: -5, temperature: 50 },
  },
  
  // === Creative ===
  {
    id: 'p-matte', name: 'Matte Finish', category: 'Creative',
    description: 'Lifted blacks for a matte film look',
    isBuiltIn: true,
    edit_data: { blacks: 35, contrast: -10, shadows: 10, vibrance: -5 },
  },
  {
    id: 'p-cross-process', name: 'Cross Process', category: 'Creative',
    description: 'Cross-processed film effect with color shifts',
    isBuiltIn: true,
    edit_data: { temperature: 400, tint: -15, contrast: 20, saturation: 15, vibrance: 20 },
  },
  {
    id: 'p-dreamy', name: 'Dreamy', category: 'Creative',
    description: 'Soft, ethereal dreamy look',
    isBuiltIn: true,
    edit_data: { clarity: -30, contrast: -15, highlights: 10, shadows: 25, vibrance: 15, dehaze: -15, exposure: 0.15 },
  },
  {
    id: 'p-vintage-faded', name: 'Vintage Fade', category: 'Vintage',
    description: 'Faded vintage photograph style',
    isBuiltIn: true,
    edit_data: { contrast: -15, blacks: 30, vibrance: -20, saturation: -15, temperature: 300, exposure: 0.1 },
  },
  {
    id: 'p-retro-70s', name: 'Retro 70s', category: 'Vintage',
    description: '1970s nostalgic color palette',
    isBuiltIn: true,
    edit_data: { temperature: 500, contrast: -10, blacks: 20, saturation: -10, vibrance: 10 },
  },
  {
    id: 'p-lomo', name: 'Lomo', category: 'Vintage',
    description: 'Lo-fi lomography effect with vignette',
    isBuiltIn: true,
    edit_data: { contrast: 30, saturation: 25, vibrance: 20, vignette: { amount: -40, midpoint: 50, roundness: 0, feather: 50, highlights: 0 } },
  },
  
  // === Cinematic ===
  {
    id: 'p-cinematic', name: 'Cinematic', category: 'Cinematic',
    description: 'Widescreen movie-grade color grading',
    isBuiltIn: true,
    edit_data: { contrast: 20, temperature: -100, tint: 5, highlights: -20, shadows: 10, clarity: 10, dehaze: 5 },
  },
  {
    id: 'p-blockbuster', name: 'Blockbuster', category: 'Cinematic',
    description: 'Hollywood action movie teal-orange look',
    isBuiltIn: true,
    edit_data: { contrast: 25, temperature: 150, highlights: -15, shadows: 15, clarity: 15, vibrance: 15 },
  },
  {
    id: 'p-indie-film', name: 'Indie Film', category: 'Cinematic',
    description: 'Desaturated indie film aesthetic',
    isBuiltIn: true,
    edit_data: { contrast: 5, saturation: -20, vibrance: -10, blacks: 15, clarity: 5, temperature: 100 },
  },
  {
    id: 'p-horror', name: 'Dark Horror', category: 'Cinematic',
    description: 'Dark, desaturated horror movie look',
    isBuiltIn: true,
    edit_data: { exposure: -0.4, contrast: 25, saturation: -30, temperature: -200, clarity: 20, blacks: -15 },
  },
];

/**
 * Get presets grouped by category
 */
export function getPresetsByCategory(presets: Preset[]): Record<string, Preset[]> {
  const grouped: Record<string, Preset[]> = {};
  for (const preset of presets) {
    if (!grouped[preset.category]) {
      grouped[preset.category] = [];
    }
    grouped[preset.category].push(preset);
  }
  return grouped;
}
