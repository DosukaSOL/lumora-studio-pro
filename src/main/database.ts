/**
 * Lumora Studio Pro — SQLite Catalog Database
 * 
 * Manages the photo catalog, edit history, presets,
 * collections, and all persistent application data.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class CatalogDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Performance optimization
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  /** Create all required tables */
  private initialize(): void {
    this.db.exec(`
      -- Images table: stores all imported photo metadata
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL UNIQUE,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        width INTEGER,
        height INTEGER,
        date_taken TEXT,
        date_imported TEXT DEFAULT (datetime('now')),
        date_modified TEXT DEFAULT (datetime('now')),
        camera_make TEXT,
        camera_model TEXT,
        lens TEXT,
        focal_length REAL,
        aperture REAL,
        shutter_speed TEXT,
        iso INTEGER,
        gps_lat REAL,
        gps_lng REAL,
        rating INTEGER DEFAULT 0,
        color_label TEXT DEFAULT 'none',
        flag TEXT DEFAULT 'none',
        keywords TEXT DEFAULT '',
        caption TEXT DEFAULT '',
        thumbnail_path TEXT,
        preview_path TEXT
      );

      -- Edits table: stores non-destructive edit instructions as JSON
      CREATE TABLE IF NOT EXISTS edits (
        id TEXT PRIMARY KEY,
        image_id TEXT NOT NULL,
        edit_data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        is_current INTEGER DEFAULT 1,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );

      -- Edit history for undo/redo
      CREATE TABLE IF NOT EXISTS edit_history (
        id TEXT PRIMARY KEY,
        image_id TEXT NOT NULL,
        edit_data TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );

      -- Presets table
      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'User',
        edit_data TEXT NOT NULL,
        is_built_in INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Collections table
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'standard',
        smart_criteria TEXT,
        parent_id TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (parent_id) REFERENCES collections(id) ON DELETE SET NULL
      );

      -- Collection-Image junction table
      CREATE TABLE IF NOT EXISTS collection_images (
        collection_id TEXT NOT NULL,
        image_id TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY (collection_id, image_id),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );

      -- Snapshots table  
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        image_id TEXT NOT NULL,
        name TEXT NOT NULL,
        edit_data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_images_date ON images(date_taken);
      CREATE INDEX IF NOT EXISTS idx_images_rating ON images(rating);
      CREATE INDEX IF NOT EXISTS idx_images_flag ON images(flag);
      CREATE INDEX IF NOT EXISTS idx_edits_image ON edits(image_id);
      CREATE INDEX IF NOT EXISTS idx_history_image ON edit_history(image_id);
      CREATE INDEX IF NOT EXISTS idx_collection_images ON collection_images(image_id);
    `);

    // Insert default presets if none exist
    this.insertDefaultPresets();
  }

  /** Insert built-in presets on first run */
  private insertDefaultPresets(): void {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM presets WHERE is_built_in = 1').get() as any;
    if (count.count > 0) return;

    const defaultPresets = [
      { name: 'Auto Tone', category: 'Basic', data: { exposure: 0.2, contrast: 15, highlights: -20, shadows: 25, whites: 10, blacks: -10 } },
      { name: 'Vivid', category: 'Color', data: { vibrance: 40, saturation: 15, contrast: 10 } },
      { name: 'Matte', category: 'Creative', data: { blacks: 30, contrast: -10, tone_curve: { shadows: { x: 0, y: 20 } } } },
      { name: 'High Contrast B&W', category: 'B&W', data: { saturation: -100, contrast: 50, whites: 20, blacks: -20 } },
      { name: 'Soft Portrait', category: 'Portrait', data: { clarity: -15, highlights: -10, shadows: 20, temperature: 200 } },
      { name: 'Landscape Pop', category: 'Landscape', data: { clarity: 25, vibrance: 30, dehaze: 15, highlights: -30 } },
      { name: 'Film Emulation', category: 'Creative', data: { temperature: 300, tint: 5, blacks: 15, grain_amount: 25, grain_size: 35 } },
      { name: 'Golden Hour', category: 'Color', data: { temperature: 800, tint: 10, exposure: 0.15, vibrance: 20 } },
      { name: 'Cool Tones', category: 'Color', data: { temperature: -500, tint: -5, vibrance: 15 } },
      { name: 'Cinematic', category: 'Creative', data: { contrast: 20, highlights: -15, shadows: -10, tint: 5, grain_amount: 15 } },
    ];

    const insert = this.db.prepare(
      'INSERT INTO presets (id, name, category, edit_data, is_built_in) VALUES (?, ?, ?, ?, 1)'
    );

    const insertMany = this.db.transaction(() => {
      for (const preset of defaultPresets) {
        insert.run(uuidv4(), preset.name, preset.category, JSON.stringify(preset.data));
      }
    });

    insertMany();
  }

  // ─── Image Operations ─────────────────────────────────────────

  importImage(imageData: any): string {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO images (id, file_path, file_name, file_size, file_type, width, height,
        date_taken, camera_make, camera_model, lens, focal_length, aperture, 
        shutter_speed, iso, gps_lat, gps_lng, thumbnail_path, preview_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, imageData.filePath, imageData.fileName, imageData.fileSize,
      imageData.fileType, imageData.width, imageData.height,
      imageData.dateTaken, imageData.cameraMake, imageData.cameraModel,
      imageData.lens, imageData.focalLength, imageData.aperture,
      imageData.shutterSpeed, imageData.iso, imageData.gpsLat,
      imageData.gpsLng, imageData.thumbnailPath, imageData.previewPath
    );
    return id;
  }

  getAllImages(options?: { rating?: number; flag?: string; colorLabel?: string; sortBy?: string; sortDir?: string }): any[] {
    let query = 'SELECT * FROM images WHERE 1=1';
    const params: any[] = [];

    if (options?.rating !== undefined) {
      query += ' AND rating >= ?';
      params.push(options.rating);
    }
    if (options?.flag) {
      query += ' AND flag = ?';
      params.push(options.flag);
    }
    if (options?.colorLabel) {
      query += ' AND color_label = ?';
      params.push(options.colorLabel);
    }

    const sortBy = options?.sortBy || 'date_imported';
    const sortDir = options?.sortDir === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortBy} ${sortDir}`;

    return this.db.prepare(query).all(...params);
  }

  getImageById(id: string): any {
    return this.db.prepare('SELECT * FROM images WHERE id = ?').get(id);
  }

  updateImage(id: string, data: Partial<any>): void {
    const ALLOWED_COLUMNS = new Set([
      'file_name', 'file_path', 'file_size', 'file_type', 'width', 'height',
      'date_taken', 'camera_make', 'camera_model', 'lens', 'focal_length',
      'aperture', 'shutter_speed', 'iso', 'gps_lat', 'gps_lng',
      'rating', 'color_label', 'flag', 'keywords', 'caption',
      'thumbnail_path', 'preview_path',
    ]);
    const safeKeys = Object.keys(data).filter(k => ALLOWED_COLUMNS.has(k));
    if (safeKeys.length === 0) return;
    const fields = safeKeys.map(k => `${k} = ?`).join(', ');
    const values = safeKeys.map(k => data[k]);
    this.db.prepare(`UPDATE images SET ${fields}, date_modified = datetime('now') WHERE id = ?`).run(...values, id);
  }

  deleteImages(ids: string[]): void {
    const placeholders = ids.map(() => '?').join(',');
    this.db.prepare(`DELETE FROM images WHERE id IN (${placeholders})`).run(...ids);
  }

  searchImages(query: string): any[] {
    return this.db.prepare(
      `SELECT * FROM images WHERE file_name LIKE ? OR keywords LIKE ? OR caption LIKE ? ORDER BY date_imported DESC`
    ).all(`%${query}%`, `%${query}%`, `%${query}%`);
  }

  // ─── Edit Operations ──────────────────────────────────────────

  saveEdits(imageId: string, editData: any): string {
    const id = uuidv4();
    // Mark all previous edits as non-current
    this.db.prepare('UPDATE edits SET is_current = 0 WHERE image_id = ?').run(imageId);
    // Insert new current edit
    this.db.prepare(
      'INSERT INTO edits (id, image_id, edit_data, is_current) VALUES (?, ?, ?, 1)'
    ).run(id, imageId, JSON.stringify(editData));
    return id;
  }

  loadCurrentEdits(imageId: string): any | null {
    const row = this.db.prepare(
      'SELECT edit_data FROM edits WHERE image_id = ? AND is_current = 1 ORDER BY created_at DESC LIMIT 1'
    ).get(imageId) as any;
    return row ? JSON.parse(row.edit_data) : null;
  }

  addEditHistory(imageId: string, editData: any, description: string): void {
    const maxStep = this.db.prepare(
      'SELECT COALESCE(MAX(step_number), 0) as max_step FROM edit_history WHERE image_id = ?'
    ).get(imageId) as any;

    this.db.prepare(
      'INSERT INTO edit_history (id, image_id, edit_data, step_number, description) VALUES (?, ?, ?, ?, ?)'
    ).run(uuidv4(), imageId, JSON.stringify(editData), maxStep.max_step + 1, description);
  }

  getEditHistory(imageId: string): any[] {
    return this.db.prepare(
      'SELECT * FROM edit_history WHERE image_id = ? ORDER BY step_number ASC'
    ).all(imageId).map((row: any) => ({
      ...row,
      edit_data: JSON.parse(row.edit_data),
    }));
  }

  // ─── Preset Operations ────────────────────────────────────────

  getAllPresets(): any[] {
    return this.db.prepare('SELECT * FROM presets ORDER BY category, name').all().map((row: any) => ({
      ...row,
      edit_data: JSON.parse(row.edit_data),
    }));
  }

  savePreset(preset: any): string {
    const id = preset.id || uuidv4();
    this.db.prepare(
      'INSERT OR REPLACE INTO presets (id, name, category, edit_data, is_built_in, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
    ).run(id, preset.name, preset.category || 'User', JSON.stringify(preset.editData), preset.isBuiltIn ? 1 : 0);
    return id;
  }

  deletePreset(id: string): void {
    this.db.prepare('DELETE FROM presets WHERE id = ? AND is_built_in = 0').run(id);
  }

  // ─── Collection Operations ────────────────────────────────────

  getAllCollections(): any[] {
    return this.db.prepare('SELECT * FROM collections ORDER BY sort_order, name').all();
  }

  createCollection(name: string, type: string = 'standard', smartCriteria?: string): string {
    const id = uuidv4();
    this.db.prepare(
      'INSERT INTO collections (id, name, type, smart_criteria) VALUES (?, ?, ?, ?)'
    ).run(id, name, type, smartCriteria || null);
    return id;
  }

  deleteCollection(id: string): void {
    this.db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  }

  addImagesToCollection(collectionId: string, imageIds: string[]): void {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO collection_images (collection_id, image_id) VALUES (?, ?)'
    );
    const insertMany = this.db.transaction(() => {
      for (const imageId of imageIds) {
        insert.run(collectionId, imageId);
      }
    });
    insertMany();
  }

  // ─── Snapshot Operations ──────────────────────────────────────

  saveSnapshot(imageId: string, name: string, editData: any): string {
    const id = uuidv4();
    this.db.prepare(
      'INSERT INTO snapshots (id, image_id, name, edit_data) VALUES (?, ?, ?, ?)'
    ).run(id, imageId, name, JSON.stringify(editData));
    return id;
  }

  getSnapshots(imageId: string): any[] {
    return this.db.prepare(
      'SELECT * FROM snapshots WHERE image_id = ? ORDER BY created_at DESC'
    ).all(imageId).map((row: any) => ({
      ...row,
      edit_data: JSON.parse(row.edit_data),
    }));
  }

  /** Close the database connection */
  close(): void {
    this.db.close();
  }
}
