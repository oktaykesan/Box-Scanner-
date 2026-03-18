// BoxScan — Database Migration Runner (better-sqlite3)

import { getDb } from './index.js';

const migrations = [
    `CREATE TABLE IF NOT EXISTS boxes (
    id TEXT PRIMARY KEY,
    title TEXT,
    qr_code TEXT NOT NULL DEFAULT '',
    location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    source TEXT NOT NULL DEFAULT 'mixed',
    created_by TEXT,
    last_scanned_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

    `CREATE TABLE IF NOT EXISTS box_images (
    id TEXT PRIMARY KEY,
    box_id TEXT NOT NULL REFERENCES boxes(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0
  )`,

    `CREATE TABLE IF NOT EXISTS box_items (
    id TEXT PRIMARY KEY,
    box_id TEXT NOT NULL REFERENCES boxes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL DEFAULT 'uncategorized'
  )`,

    `CREATE TABLE IF NOT EXISTS analysis_runs (
    id TEXT PRIMARY KEY,
    box_id TEXT REFERENCES boxes(id) ON DELETE SET NULL,
    image_id TEXT REFERENCES box_images(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    raw_response TEXT,
    parsed_json TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
  )`,

    `CREATE TABLE IF NOT EXISTS box_events (
    id TEXT PRIMARY KEY,
    box_id TEXT NOT NULL REFERENCES boxes(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL
  )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_boxes_status ON boxes(status)`,
    `CREATE INDEX IF NOT EXISTS idx_boxes_created_at ON boxes(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_boxes_last_scanned ON boxes(last_scanned_at)`,
    `CREATE INDEX IF NOT EXISTS idx_box_images_box_id ON box_images(box_id)`,
    `CREATE INDEX IF NOT EXISTS idx_box_items_box_id ON box_items(box_id)`,
    `CREATE INDEX IF NOT EXISTS idx_box_items_normalized ON box_items(normalized_name)`,
    `CREATE INDEX IF NOT EXISTS idx_box_items_category ON box_items(category)`,
    `CREATE INDEX IF NOT EXISTS idx_analysis_runs_box_id ON analysis_runs(box_id)`,
    `CREATE INDEX IF NOT EXISTS idx_box_events_box_id ON box_events(box_id)`,
    `CREATE INDEX IF NOT EXISTS idx_box_events_type ON box_events(event_type)`,

    // Extended AI fields (boxes)
    `ALTER TABLE boxes ADD COLUMN damage_flag INTEGER DEFAULT 0`,
    `ALTER TABLE boxes ADD COLUMN damage_notes TEXT DEFAULT NULL`,
    `ALTER TABLE boxes ADD COLUMN hazard_flag INTEGER DEFAULT 0`,
    `ALTER TABLE boxes ADD COLUMN hazard_notes TEXT DEFAULT NULL`,
    `ALTER TABLE boxes ADD COLUMN summary TEXT DEFAULT NULL`,

    // -- v2: Partial indexes for status != 'deleted' queries
    `CREATE INDEX IF NOT EXISTS idx_boxes_not_deleted ON boxes(created_at DESC) WHERE status != 'deleted'`,
    `CREATE INDEX IF NOT EXISTS idx_boxes_status_not_deleted ON boxes(status, location) WHERE status != 'deleted'`,

    // -- v3: Triggers for status validation on boxes
    `CREATE TRIGGER IF NOT EXISTS chk_boxes_status_insert
BEFORE INSERT ON boxes
BEGIN
  SELECT CASE WHEN NEW.status NOT IN ('active','archived','deleted','damaged')
    THEN RAISE(ABORT,'Invalid status value') END;
END`,

    `CREATE TRIGGER IF NOT EXISTS chk_boxes_status_update
BEFORE UPDATE OF status ON boxes
BEGIN
  SELECT CASE WHEN NEW.status NOT IN ('active','archived','deleted','damaged')
    THEN RAISE(ABORT,'Invalid status value') END;
END`,

    // Triggers for provider validation on analysis_runs
    `CREATE TRIGGER IF NOT EXISTS chk_analysis_provider_insert
BEFORE INSERT ON analysis_runs
BEGIN
  SELECT CASE WHEN NEW.provider NOT IN ('mock','gemini','local')
    THEN RAISE(ABORT,'Invalid provider value') END;
END`,

    `CREATE TRIGGER IF NOT EXISTS chk_analysis_provider_update
BEFORE UPDATE OF provider ON analysis_runs
BEGIN
  SELECT CASE WHEN NEW.provider NOT IN ('mock','gemini','local')
    THEN RAISE(ABORT,'Invalid provider value') END;
END`,

    // -- v4: created_at columns for box_items and box_images
    `ALTER TABLE box_items ADD COLUMN created_at TEXT`,
    `ALTER TABLE box_images ADD COLUMN created_at TEXT`,

    // -- v5: Migration log table
    `CREATE TABLE IF NOT EXISTS migration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

    // Retroactive log entries for existing migrations
    `INSERT OR IGNORE INTO migration_log (version, applied_at) VALUES ('v1_initial', datetime('now'))`,
    `INSERT OR IGNORE INTO migration_log (version, applied_at) VALUES ('v2_partial_indexes', datetime('now'))`,
    `INSERT OR IGNORE INTO migration_log (version, applied_at) VALUES ('v3_triggers', datetime('now'))`,
    `INSERT OR IGNORE INTO migration_log (version, applied_at) VALUES ('v4_created_at_columns', datetime('now'))`,

    // -- v5 (revised): Remove cascade triggers — soft-delete should preserve items/images
    // Eski soft-delete cascade trigger'larını temizle (idempotent)
    `DROP TRIGGER IF EXISTS trg_boxes_soft_delete_images`,
    `DROP TRIGGER IF EXISTS trg_boxes_soft_delete_items`,

    `INSERT OR IGNORE INTO migration_log (version, applied_at) VALUES ('v5_soft_delete_triggers', datetime('now'))`,
    `INSERT OR IGNORE INTO migration_log (version, applied_at) VALUES ('v7_remove_cascade_triggers', datetime('now'))`,

    // -- v6: FTS5 full-text search on box_items
    // Eski şemayla oluşturulmuş tablo varsa temizle (content_rowid → box_id migrasyonu)
    `DROP TABLE IF EXISTS box_items_fts`,

    // box_id ve item_id UNINDEXED — arama değil, join için tutulur
    // content table kullanılmıyor: box_items.id TEXT UUID, FTS5 rowid INTEGER gerektirir
    `CREATE VIRTUAL TABLE IF NOT EXISTS box_items_fts
USING fts5(
  box_id UNINDEXED,
  item_id UNINDEXED,
  name,
  normalized_name,
  category,
  tokenize='unicode61 remove_diacritics 2'
)`,

    // Eski FTS trigger'larını temizle (DROP TABLE cascade etmez)
    `DROP TRIGGER IF EXISTS trg_box_items_fts_insert`,
    `DROP TRIGGER IF EXISTS trg_box_items_fts_update`,
    `DROP TRIGGER IF EXISTS trg_box_items_fts_delete`,

    // Mevcut verileri FTS indeksine aktar
    `INSERT INTO box_items_fts(box_id, item_id, name, normalized_name, category)
SELECT box_id, id, COALESCE(name,''), COALESCE(normalized_name,''), COALESCE(category,'')
FROM box_items`,

    // FTS indeksini güncel tutan trigger'lar
    `CREATE TRIGGER IF NOT EXISTS trg_box_items_fts_insert
AFTER INSERT ON box_items BEGIN
  INSERT INTO box_items_fts(box_id, item_id, name, normalized_name, category)
  VALUES (NEW.box_id, NEW.id, COALESCE(NEW.name,''), COALESCE(NEW.normalized_name,''), COALESCE(NEW.category,''));
END`,

    `CREATE TRIGGER IF NOT EXISTS trg_box_items_fts_update
AFTER UPDATE ON box_items BEGIN
  DELETE FROM box_items_fts WHERE item_id = OLD.id;
  INSERT INTO box_items_fts(box_id, item_id, name, normalized_name, category)
  VALUES (NEW.box_id, NEW.id, COALESCE(NEW.name,''), COALESCE(NEW.normalized_name,''), COALESCE(NEW.category,''));
END`,

    `CREATE TRIGGER IF NOT EXISTS trg_box_items_fts_delete
AFTER DELETE ON box_items BEGIN
  DELETE FROM box_items_fts WHERE item_id = OLD.id;
END`,

    `INSERT OR IGNORE INTO migration_log (version, applied_at) VALUES ('v6_fts5_search', datetime('now'))`,
];

export async function runMigrations(): Promise<void> {
    console.log('🗄️  Running database migrations...');
    const db = getDb();

    const runAll = db.transaction(() => {
        for (const sql of migrations) {
            try {
                db.exec(sql);
            } catch (err: any) {
                if (err?.message?.includes('duplicate column name')) continue;
                if (err?.message?.includes('already exists')) continue;
                throw err;
            }
        }
    });
    runAll();

    console.log('✅ Database migrations completed');
}

// Run if called directly
const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
    runMigrations().then(() => process.exit(0));
}
