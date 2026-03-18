// BoxScan — Scan Route — better-sqlite3 version

import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryAll, queryOne, runTransaction } from '../db/index.js';
import { validateBody } from '../lib/validation.js';
import { buildSuccessResponse, Errors } from '../lib/errors.js';
import { ScanPayloadSchema } from '../shared/schemas.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono();

/**
 * POST /api/scan
 * QR scan → box lookup + update last_scanned_at + log event.
 */
app.post(
    '/',
    rateLimit(120),
    authMiddleware(),
    validateBody(ScanPayloadSchema),
    async (c) => {
        const { boxId } = (c as any).get('validatedBody');
        const now = new Date().toISOString();
        const db = getDb();

        const box = queryOne(db, 'SELECT * FROM boxes WHERE id = ?', [boxId]);
        if (!box) throw Errors.notFound('Box', boxId);

        if (box.status === 'deleted') {
            throw Errors.notFound('Box', boxId);
        }

        // Update last_scanned_at and log scan event in a single transaction
        runTransaction(db, () => {
            db.prepare('UPDATE boxes SET last_scanned_at = ? WHERE id = ?').run(now, boxId);
            db.prepare(
                `INSERT INTO box_events (id, box_id, event_type, payload, created_at) VALUES (?, ?, 'scanned', NULL, ?)`
            ).run(uuidv4(), boxId, now);
        });

        // Fetch full box details
        const images = queryAll(db, 'SELECT * FROM box_images WHERE box_id = ?', [boxId]);
        const items = queryAll(db, 'SELECT * FROM box_items WHERE box_id = ?', [boxId]);

        const data = {
            ...box,
            last_scanned_at: now,
            images: images.map((img: any) => ({ ...img, is_primary: Boolean(img.is_primary) })),
            items,
            item_count: items.length,
        };

        return c.json(buildSuccessResponse(data));
    }
);

export default app;
