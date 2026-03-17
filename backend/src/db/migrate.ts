// BoxScan — Database Migration Runner (sql.js)

import { getDb, saveDb } from './index.js';

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
];

export async function runMigrations(): Promise<void> {
    console.log('🗄️  Running database migrations...');

    const db = await getDb();
    for (const sql of migrations) {
        try {
            db.run(sql);
        } catch (err: any) {
            if (err?.message?.includes('duplicate column name')) {
                // Column already exists (re-running migrations)
                continue;
            }
            throw err;
        }
    }
    saveDb();

    console.log('✅ Database migrations completed');
}

// Run if called directly
const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
    runMigrations().then(() => process.exit(0));
}
