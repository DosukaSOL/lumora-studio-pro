# Lumora Studio Pro

**Professional RAW photo editor and asset manager** — a modern, open-source alternative to Adobe Lightroom built with Electron, React, and TypeScript.

<p align="center">
  <img src="resources/icon.svg" width="128" alt="Lumora Studio Pro" />
</p>

---

## Features

### Library Module
- **Photo Browser** — Grid and loupe views with infinite scroll
- **Catalog System** — SQLite-backed catalog with full metadata indexing
- **Smart Previews** — Automatic thumbnail generation and caching
- **Organization** — Collections, keywords, ratings (1-5 ★), color labels, pick/reject flags
- **Metadata** — Full EXIF/IPTC display and editing
- **Import** — Drag-and-drop or dialog-based import with duplicate detection

### Develop Module
- **Non-Destructive Editing** — All adjustments stored as parameters, original files untouched
- **Basic Adjustments** — White Balance (presets + manual Temp/Tint), Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Vibrance, Saturation
- **Tone Curve** — Interactive point curve editor with per-channel control (RGB, R, G, B)
- **HSL / Color** — Hue, Saturation, and Luminance control for 8 color ranges
- **Color Grading** — Three-way color wheels (Shadows / Midtones / Highlights) with Blending and Balance
- **Detail** — Sharpening (Amount, Radius, Detail, Masking) and Noise Reduction (Luminance, Color)
- **Optics** — Lens Profile Corrections and Chromatic Aberration removal
- **Geometry** — Upright perspective correction, Distortion, and manual Transform controls
- **Effects** — Texture, Clarity, Dehaze, Vignette (5 params), and Grain (3 params)
- **Calibration** — Shadow Tint, Red/Green/Blue Primary Hue and Saturation

### Rendering Engine
- **WebGL GPU Acceleration** — Real-time preview rendering with custom GLSL shaders
- **Canvas Fallback** — Automatic fallback to 2D context when WebGL is unavailable
- **Before / After** — Side-by-side comparison view

### Export
- **Formats** — JPEG, PNG, TIFF with quality control
- **Resize** — Specific dimensions, percentage, or long edge
- **Watermark** — Text watermark with configurable opacity and position
- **Batch Export** — Export multiple images with consistent settings

### History & Presets
- **Unlimited Undo/Redo** — 100-step history stack per image
- **Snapshots** — Save and recall specific editing states
- **Presets** — 10 built-in presets, create/import/export custom presets
- **Copy/Paste** — Copy settings between images

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 33 |
| Frontend | React 18 + TypeScript 5 |
| Bundler | Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand 5 |
| Database | better-sqlite3 (SQLite3) |
| Image Processing | Sharp (server-side) + WebGL (client-side) |
| Metadata | exifr |
| Packaging | electron-builder |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or yarn/pnpm)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lumora-studio-pro.git
cd lumora-studio-pro

# Install dependencies
npm install

# Start development mode
npm run dev
```

This launches Vite dev server on port 5173 and opens the Electron window.

### Build

```bash
# Production build (renderer + main)
npm run build

# Package for your platform
npm run package:mac    # macOS → DMG + ZIP
npm run package:win    # Windows → NSIS + ZIP
npm run package:linux  # Linux → AppImage + DEB
```

---

## Project Structure

```
lumora-studio-pro/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry, window creation
│   │   ├── preload.ts           # IPC bridge (contextBridge)
│   │   ├── menu.ts              # Native application menus
│   │   ├── database.ts          # SQLite catalog database
│   │   ├── ipc-handlers.ts      # IPC request handlers
│   │   └── image-processor.ts   # Sharp-based image processing
│   │
│   └── renderer/                # React frontend
│       ├── main.tsx             # React entry point
│       ├── App.tsx              # Root layout component
│       ├── components/          # UI components
│       │   ├── TitleBar.tsx
│       │   ├── ModuleBar.tsx
│       │   ├── Toolbar.tsx
│       │   ├── CenterView.tsx
│       │   ├── LibraryGrid.tsx
│       │   ├── DevelopView.tsx
│       │   ├── Filmstrip.tsx
│       │   ├── StatusBar.tsx
│       │   ├── EditSlider.tsx
│       │   ├── CollapsiblePanel.tsx
│       │   ├── ToneCurveEditor.tsx
│       │   ├── ExportDialog.tsx
│       │   └── ImportDialog.tsx
│       ├── panels/
│       │   ├── LeftPanel.tsx     # Navigator, Histogram, Presets, History
│       │   └── RightPanel.tsx    # All editing controls
│       ├── engine/
│       │   └── WebGLRenderer.ts  # GPU-accelerated rendering
│       ├── stores/
│       │   ├── appStore.ts       # Application state
│       │   └── editStore.ts      # Edit parameters + undo/redo
│       ├── styles/
│       │   └── index.css         # Tailwind + custom styles
│       └── assets/
│           └── logo.svg          # Brand wordmark
├── resources/
│   └── icon.svg                  # Application icon
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` | Switch to Library |
| `D` | Switch to Develop |
| `\` | Toggle Before/After |
| `Tab` | Toggle side panels |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + I` | Import photos |
| `Cmd/Ctrl + Shift + E` | Export |
| `+` / `-` | Zoom in/out |
| `0` | Fit to screen |
| `1-5` | Set rating |

---

## Architecture Highlights

- **Non-destructive editing** — Original files are never modified. All adjustments are stored as JSON parameters in the SQLite catalog.
- **Dual rendering pipeline** — Server-side processing via Sharp for final export; client-side WebGL shaders for real-time preview.
- **IPC isolation** — All file system and database access goes through Electron's IPC bridge with a strict context-isolated preload script.
- **WAL mode SQLite** — Write-Ahead Logging for high-performance concurrent reads during UI rendering.

---

## License

MIT © Lumora Studio Team
