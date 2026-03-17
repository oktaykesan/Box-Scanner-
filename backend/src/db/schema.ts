// BoxScan — Database Schema (Drizzle ORM + SQLite)

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── Boxes ──────────────────────────────────────────
export const boxes = sqliteTable('boxes', {
    id: text('id').primaryKey(),
    title: text('title'),
    qr_code: text('qr_code').notNull().default(''),
    location: text('location'),
    notes: text('notes'),
    status: text('status').notNull().default('active'),
    source: text('source').notNull().default('mixed'),
    created_by: text('created_by'),
    last_scanned_at: text('last_scanned_at'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
    damage_flag: integer('damage_flag', { mode: 'boolean' }).default(false),
    damage_notes: text('damage_notes'),
    hazard_flag: integer('hazard_flag', { mode: 'boolean' }).default(false),
    hazard_notes: text('hazard_notes'),
    summary: text('summary'),
});

// ─── Box Images ─────────────────────────────────────
export const boxImages = sqliteTable('box_images', {
    id: text('id').primaryKey(),
    box_id: text('box_id').notNull().references(() => boxes.id, { onDelete: 'cascade' }),
    image_url: text('image_url').notNull(),
    is_primary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
});

// ─── Box Items ──────────────────────────────────────
export const boxItems = sqliteTable('box_items', {
    id: text('id').primaryKey(),
    box_id: text('box_id').notNull().references(() => boxes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    normalized_name: text('normalized_name'),
    quantity: integer('quantity').notNull().default(1),
    category: text('category').notNull().default('uncategorized'),
});

// ─── Analysis Runs ──────────────────────────────────
export const analysisRuns = sqliteTable('analysis_runs', {
    id: text('id').primaryKey(),
    box_id: text('box_id').references(() => boxes.id, { onDelete: 'set null' }),
    image_id: text('image_id').references(() => boxImages.id, { onDelete: 'set null' }),
    provider: text('provider').notNull(), // gemini | local | mock
    raw_response: text('raw_response'),
    parsed_json: text('parsed_json'),
    status: text('status').notNull(), // success | parse_error | failed
    error_message: text('error_message'),
    created_at: text('created_at').notNull(),
});

// ─── Box Events (write-only in Phase 01) ────────────
export const boxEvents = sqliteTable('box_events', {
    id: text('id').primaryKey(),
    box_id: text('box_id').notNull().references(() => boxes.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull(), // created | updated | scanned | deleted
    payload: text('payload'),
    created_at: text('created_at').notNull(),
});
