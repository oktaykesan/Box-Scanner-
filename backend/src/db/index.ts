// BoxScan — Database Connection (better-sqlite3 — native SQLite)

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DB_PATH config.ts üzerinden validate ediliyor (src/config.ts:db.path)
// Circular dependency nedeniyle process.env doğrudan okunuyor
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../boxscan.db');

let _db: Database.Database | null = null;

/**
 * Get the database instance (singleton).
 * better-sqlite3 opens/creates the file directly on first call.
 */
export function getDb(): Database.Database {
    if (_db) return _db;
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');   // WAL modu: crash-safe, concurrent okuma
    _db.pragma('foreign_keys = ON');
    return _db;
}

/**
 * @deprecated better-sqlite3'e geçişten sonra artık gerekmiyor.
 * WAL modu her write'ı doğrudan diske yazar.
 * Geriye dönük uyumluluk için bırakıldı — ileriki sürümde kaldırılacak.
 */
export function saveDb(): void {}

/**
 * Helper: run a query and return all rows as objects.
 */
export function queryAll(db: Database.Database, sql: string, params: any[] = []): any[] {
    return db.prepare(sql).all(...params);
}

/**
 * Helper: run a query and return the first row.
 */
export function queryOne(db: Database.Database, sql: string, params: any[] = []): any | null {
    return db.prepare(sql).get(...params) ?? null;
}

/**
 * Helper: run an insert/update/delete.
 * better-sqlite3 writes synchronously to disk — no saveDb() needed.
 */
export function execute(db: Database.Database, sql: string, params: any[] = []): void {
    db.prepare(sql).run(...params);
}

/**
 * Helper: run multiple statements in a transaction.
 */
export function runTransaction(db: Database.Database, fn: () => void): void {
    const txn = db.transaction(fn);
    txn();
}
