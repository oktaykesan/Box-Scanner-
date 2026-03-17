// BoxScan — Database Connection (sql.js — pure JS SQLite)

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DB_PATH can be overridden via env to place the file outside the web-served directory tree
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../boxscan.db');

let _db: SqlJsDatabase | null = null;

/**
 * Get the database instance (singleton).
 * Initializes on first call and loads existing DB file if present.
 */
export async function getDb(): Promise<SqlJsDatabase> {
    if (_db) return _db;

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        _db = new SQL.Database(buffer);
    } else {
        _db = new SQL.Database();
    }

    // Enable foreign keys
    _db.run('PRAGMA foreign_keys = ON');

    return _db;
}

/**
 * Save the database to disk.
 * Call after write operations.
 */
export function saveDb(): void {
    if (!_db) return;
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Helper: run a query and return all rows as objects.
 */
export function queryAll(db: SqlJsDatabase, sql: string, params: any[] = []): any[] {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

/**
 * Helper: run a query and return the first row.
 */
export function queryOne(db: SqlJsDatabase, sql: string, params: any[] = []): any | null {
    const rows = queryAll(db, sql, params);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: run an insert/update/delete and save to disk.
 */
export function execute(db: SqlJsDatabase, sql: string, params: any[] = []): void {
    db.run(sql, params);
    saveDb();
}

/**
 * Helper: run multiple statements in a transaction.
 */
export function runTransaction(db: SqlJsDatabase, fn: () => void): void {
    db.run('BEGIN TRANSACTION');
    try {
        fn();
        db.run('COMMIT');
        saveDb();
    } catch (err) {
        db.run('ROLLBACK');
        throw err;
    }
}
