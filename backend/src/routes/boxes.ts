// BoxScan — Boxes Routes (CRUD + Search/Filter) — better-sqlite3 version

import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryAll, queryOne, runTransaction } from '../db/index.js';
import { validateBody, validateParams, validateQuery } from '../lib/validation.js';
import { buildSuccessResponse, Errors } from '../lib/errors.js';
import { CreateBoxSchema, UpdateBoxSchema, BoxIdParamSchema, BoxListQuerySchema } from '../shared/schemas.js';
import { normalizeItems } from '../services/items.js';
import { buildQRPayload } from '../services/qr.js';
import { deleteFiles } from '../services/storage.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { config } from '../config.js';
import type Database from 'better-sqlite3';

const app = new Hono();

// Smart search token limit: maximum boxes sent to Gemini in a single request
const SMART_SEARCH_BOX_LIMIT = 200;

// ─── Helper: Bulk-fetch images and items for a set of box IDs ──────────

function fetchBulkDetails(db: Database.Database, boxIds: string[]) {
    if (boxIds.length === 0) return { imagesMap: new Map(), itemsMap: new Map() };
    const ph = boxIds.map(() => '?').join(',');
    const images = queryAll(db, `SELECT * FROM box_images WHERE box_id IN (${ph})`, boxIds);
    const items = queryAll(db, `SELECT * FROM box_items WHERE box_id IN (${ph})`, boxIds);
    const imagesMap = new Map<string, any[]>();
    const itemsMap = new Map<string, any[]>();
    for (const img of images) {
        if (!imagesMap.has(img.box_id)) imagesMap.set(img.box_id, []);
        imagesMap.get(img.box_id)!.push(img);
    }
    for (const item of items) {
        if (!itemsMap.has(item.box_id)) itemsMap.set(item.box_id, []);
        itemsMap.get(item.box_id)!.push(item);
    }
    return { imagesMap, itemsMap };
}

// ─── Helper: Fetch box with images + items ──────────
async function getBoxWithDetails(boxId: string) {
    const db = getDb();
    const box = queryOne(db, 'SELECT * FROM boxes WHERE id = ?', [boxId]);
    if (!box) return null;

    const images = queryAll(db, 'SELECT * FROM box_images WHERE box_id = ? ORDER BY is_primary DESC, id ASC', [boxId]);
    const items = queryAll(db, 'SELECT * FROM box_items WHERE box_id = ?', [boxId]);
    const primaryImg = images.find((img: any) => img.is_primary) || images[0] || null;
    const primary_image_url = primaryImg ? primaryImg.image_url : null;

    return {
        ...box,
        images: images.map((img: any) => ({ ...img, is_primary: Boolean(img.is_primary) })),
        items,
        item_count: items.length,
        primary_image_url,
    };
}

// ─── GET /search/smart — Semantic search (Gemini or mock) ──────────
app.get(
    '/search/smart',
    rateLimit(20),
    authMiddleware(),
    async (c) => {
        const q = (c.req.query('q') || '').trim();
        if (!q) {
            return c.json(buildSuccessResponse({ query: q, results: [], provider: 'none' }));
        }

        const db = getDb();

        // Gorev 5: Limit boxes sent to AI to protect against token overflows
        const rawBoxList = queryAll(db, `SELECT * FROM boxes WHERE status != 'deleted' LIMIT ${SMART_SEARCH_BOX_LIMIT + 1}`);
        if (rawBoxList.length === 0) {
            return c.json(buildSuccessResponse({ query: q, results: [], provider: 'mock' }));
        }

        const truncated = rawBoxList.length > SMART_SEARCH_BOX_LIMIT;
        const boxList = truncated ? rawBoxList.slice(0, SMART_SEARCH_BOX_LIMIT) : rawBoxList;

        // Fetch all items for visible boxes in two bulk queries (no N+1)
        const boxIds: string[] = boxList.map((b: any) => b.id);
        const placeholders = boxIds.map(() => '?').join(',');
        const allItems = queryAll(db, `SELECT * FROM box_items WHERE box_id IN (${placeholders})`, boxIds);

        // Build item map by box_id
        const itemsByBox = new Map<string, any[]>();
        for (const item of allItems) {
            const list = itemsByBox.get(item.box_id) ?? [];
            list.push(item);
            itemsByBox.set(item.box_id, list);
        }

        const boxesWithDetails = boxList.map((box: any) => ({
            id: box.id,
            title: box.title,
            location: box.location,
            summary: box.summary ?? '',
            items: (itemsByBox.get(box.id) ?? []).map((i: any) => ({ name: i.name })),
        }));

        if (config.ai.provider === 'gemini') {
            const apiKey = config.ai.geminiApiKey;
            if (!apiKey) {
                return c.json(buildSuccessResponse({ query: q, results: [], provider: 'gemini', error: 'GEMINI_API_KEY not configured' }));
            }
            try {
                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                const prompt = `Kullanıcı şunu arıyor: "${q}"

Aşağıdaki kutu listesinden en alakalı olanları bul.
Sadece JSON formatında yanıt ver:

{
  "results": [
    {
      "boxId": "string",
      "relevance": "high|medium|low",
      "reason": "neden eşleştiğinin kısa açıklaması"
    }
  ]
}

Kutu listesi:
${JSON.stringify(boxesWithDetails, null, 2)}`;

                const timeoutMs = 30_000;
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini smart search timeout')), timeoutMs)
                );
                const geminiResult = await Promise.race([
                    model.generateContent(prompt),
                    timeoutPromise,
                ]);
                const text = geminiResult.response.text();
                let jsonStr = text.trim();
                const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch) jsonStr = jsonMatch[1].trim();
                const parsed = JSON.parse(jsonStr);
                const results = Array.isArray(parsed.results) ? parsed.results : [];

                const orderMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
                results.sort((a: any, b: any) => (orderMap[a.relevance] ?? 3) - (orderMap[b.relevance] ?? 3));

                // Bulk-fetch images and items for all matched boxes (no N+1)
                const matchedIds: string[] = results.map((r: any) => r.boxId).filter(Boolean);
                const { imagesMap: geminiImagesByBox, itemsMap: geminiItemsByBox } = fetchBulkDetails(db, matchedIds);
                const boxRowsById = new Map<string, any>(boxList.map((b: any) => [b.id, b]));
                const output: any[] = [];
                for (const r of results) {
                    const boxRow = boxRowsById.get(r.boxId);
                    if (!boxRow) continue;
                    const imgs = geminiImagesByBox.get(r.boxId) ?? [];
                    const its = geminiItemsByBox.get(r.boxId) ?? [];
                    const primaryImg = imgs.find((img: any) => img.is_primary) || imgs[0] || null;
                    output.push({
                        box: {
                            ...boxRow,
                            images: imgs.map((img: any) => ({ ...img, is_primary: Boolean(img.is_primary) })),
                            items: its,
                            item_count: its.length,
                            primary_image_url: primaryImg ? primaryImg.image_url : null,
                        },
                        relevance: r.relevance || 'medium',
                        reason: r.reason || '',
                    });
                }
                return c.json(buildSuccessResponse({
                    query: q,
                    results: output,
                    provider: 'gemini',
                    meta: { truncated },
                }));
            } catch (err: any) {
                console.error('[SmartSearch] Gemini error:', err);
                throw Errors.internal('AI arama servisi yanıt vermedi');
            }
        }

        // Mock: simple string match on item names
        const qLower = q.toLowerCase();
        const matches: { boxId: string; relevance: string; reason: string }[] = [];
        for (const b of boxesWithDetails) {
            const itemNames = (b.items || []).map((i: any) => i.name || '').join(' ').toLowerCase();
            const titleLoc = `${(b.title || '')} ${(b.location || '')} ${b.summary || ''}`.toLowerCase();
            const combined = `${itemNames} ${titleLoc}`;
            if (combined.includes(qLower)) {
                const relevance = itemNames.includes(qLower) ? 'high' : 'medium';
                matches.push({
                    boxId: b.id,
                    relevance,
                    reason: `"${q}" kelimesi eşleşti`,
                });
            }
        }
        // Bulk-fetch images and items for all mock matched boxes (no N+1)
        const mockMatchedIds: string[] = matches.map((m) => m.boxId);
        const { imagesMap: mockImagesByBox, itemsMap: mockItemsByBox } = fetchBulkDetails(db, mockMatchedIds);
        const mockBoxRowsById = new Map<string, any>(boxList.map((b: any) => [b.id, b]));
        const output: any[] = [];
        for (const m of matches) {
            const boxRow = mockBoxRowsById.get(m.boxId);
            if (!boxRow) continue;
            const imgs = mockImagesByBox.get(m.boxId) ?? [];
            const its = mockItemsByBox.get(m.boxId) ?? [];
            const primaryImg = imgs.find((img: any) => img.is_primary) || imgs[0] || null;
            output.push({
                box: {
                    ...boxRow,
                    images: imgs.map((img: any) => ({ ...img, is_primary: Boolean(img.is_primary) })),
                    items: its,
                    item_count: its.length,
                    primary_image_url: primaryImg ? primaryImg.image_url : null,
                },
                relevance: m.relevance,
                reason: m.reason,
            });
        }
        return c.json(buildSuccessResponse({
            query: q,
            results: output,
            provider: 'mock',
            meta: { truncated },
        }));
    }
);

// ─── GET / — List boxes with search/filter ──────────
app.get(
    '/',
    rateLimit(60),
    authMiddleware(),
    validateQuery(BoxListQuerySchema),
    async (c) => {
        const query = (c as any).get('validatedQuery');
        const { search, category, location, status, limit, offset, sort, order } = query;
        const db = getDb();

        let sql = 'SELECT * FROM boxes WHERE 1=1';
        let countSql = 'SELECT COUNT(*) as count FROM boxes WHERE 1=1';
        const params: any[] = [];
        const countParams: any[] = [];

        // Status filter
        if (status) {
            sql += ' AND status = ?';
            countSql += ' AND status = ?';
            params.push(status);
            countParams.push(status);
        } else {
            sql += " AND status != 'deleted'";
            countSql += " AND status != 'deleted'";
        }

        // Location filter
        if (location) {
            sql += ' AND location LIKE ?';
            countSql += ' AND location LIKE ?';
            const loc = `%${location}%`;
            params.push(loc);
            countParams.push(loc);
        }

        // Search (title + item names via FTS5, fallback to LIKE)
        if (search) {
            const ftsTokens = search
                .replace(/[^\w\s\u00C0-\u024F\u0400-\u04FF]/g, ' ')  // sadece harf/rakam/unicode bırak
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((w: string) => w + '*')
                .join(' ');
            const ftsQuery = ftsTokens || null;
            let ftsBoxIds: string[] = [];
            let usedFts = false;
            if (ftsQuery) {
                try {
                    const ftsRows = queryAll(
                        db,
                        `SELECT DISTINCT box_id FROM box_items_fts WHERE box_items_fts MATCH ?`,
                        [ftsQuery]
                    );
                    ftsBoxIds = ftsRows.map((r: any) => r.box_id);
                    usedFts = true;
                } catch {
                    // FTS5 unavailable or index not populated — fall through to LIKE
                }
            }

            if (usedFts) {
                // Build IN clause for matched box_ids; also match on title via LIKE
                const searchPattern = `%${search}%`;
                if (ftsBoxIds.length > 0) {
                    const ph = ftsBoxIds.map(() => '?').join(',');
                    sql += ` AND (title LIKE ? OR id IN (${ph}))`;
                    countSql += ` AND (title LIKE ? OR id IN (${ph}))`;
                    params.push(searchPattern, ...ftsBoxIds);
                    countParams.push(searchPattern, ...ftsBoxIds);
                } else {
                    // FTS returned no item matches — search title only
                    sql += ` AND title LIKE ?`;
                    countSql += ` AND title LIKE ?`;
                    params.push(searchPattern);
                    countParams.push(searchPattern);
                }
            } else {
                // LIKE fallback
                const searchPattern = `%${search}%`;
                sql += ` AND (title LIKE ? OR id IN (
        SELECT DISTINCT box_id FROM box_items
        WHERE name LIKE ? OR normalized_name LIKE ?
      ))`;
                countSql += ` AND (title LIKE ? OR id IN (
        SELECT DISTINCT box_id FROM box_items
        WHERE name LIKE ? OR normalized_name LIKE ?
      ))`;
                params.push(searchPattern, searchPattern, searchPattern);
                countParams.push(searchPattern, searchPattern, searchPattern);
            }
        }

        // Category filter (via items)
        if (category) {
            sql += ` AND id IN (SELECT DISTINCT box_id FROM box_items WHERE category = ?)`;
            countSql += ` AND id IN (SELECT DISTINCT box_id FROM box_items WHERE category = ?)`;
            params.push(category);
            countParams.push(category);
        }

        // Sort
        const sortField = ['created_at', 'updated_at', 'last_scanned_at', 'title'].includes(sort)
            ? sort : 'created_at';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortField} ${sortOrder}`;

        // Pagination
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const boxList = queryAll(db, sql, params);
        const totalResult = queryOne(db, countSql, countParams);

        // Gorev 2: N+1 fix — fetch all images and items for the page in two bulk queries
        const boxIds: string[] = boxList.map((b: any) => b.id);
        const { imagesMap: imagesByBox, itemsMap: itemsByBox } = fetchBulkDetails(db, boxIds);

        const data = boxList.map((box: any) => {
            const images = imagesByBox.get(box.id) ?? [];
            const items = itemsByBox.get(box.id) ?? [];
            const primaryImg = images.find((img: any) => img.is_primary) || images[0] || null;
            const primary_image_url = primaryImg ? primaryImg.image_url : null;
            return {
                ...box,
                images: images.map((img: any) => ({ ...img, is_primary: Boolean(img.is_primary) })),
                items,
                item_count: items.length,
                primary_image_url,
            };
        });

        return c.json(buildSuccessResponse({
            boxes: data,
            total: totalResult?.count || 0,
            limit,
            offset,
        }));
    }
);

// ─── GET /:id — Box detail ──────────────────────────
app.get(
    '/:id',
    rateLimit(60),
    authMiddleware(),
    validateParams(BoxIdParamSchema),
    async (c) => {
        const { id } = (c as any).get('validatedParams');
        const data = await getBoxWithDetails(id);
        if (!data) throw Errors.notFound('Box', id);
        return c.json(buildSuccessResponse(data));
    }
);

// ─── POST / — Create box (transaction) ──────────────
app.post(
    '/',
    rateLimit(30),
    authMiddleware(),
    validateBody(CreateBoxSchema),
    async (c) => {
        const body = (c as any).get('validatedBody');
        const now = new Date().toISOString();
        const boxId = uuidv4();
        const db = getDb();

        // Normalize items
        const normalizedItems = normalizeItems(body.items);

        // Build QR payload
        const qrPayload = buildQRPayload(
            boxId,
            body.title || null,
            normalizedItems.map((i: any) => i.name)
        );
        const qrString = JSON.stringify(qrPayload);

        try {
            runTransaction(db, () => {
                // 1. Create box
                const damageFlag = body.damage_flag ? 1 : 0;
                const hazardFlag = body.hazard_flag ? 1 : 0;
                db.prepare(
                    `INSERT INTO boxes (id, title, qr_code, location, notes, status, source, created_at, updated_at, damage_flag, damage_notes, hazard_flag, hazard_notes, summary)
           VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)`
                ).run(boxId, body.title || null, qrString, body.location || null, body.notes || null, body.source || 'mixed', now, now, damageFlag, body.damage_notes ?? null, hazardFlag, body.hazard_notes ?? null, body.summary ?? null);

                // 2. Create images
                const insertImage = db.prepare(
                    `INSERT INTO box_images (id, box_id, image_url, is_primary) VALUES (?, ?, ?, ?)`
                );
                for (let i = 0; i < (body.imageUrls || []).length; i++) {
                    insertImage.run(uuidv4(), boxId, body.imageUrls[i], i === (body.primaryImageIndex ?? 0) ? 1 : 0);
                }

                // 3. Create items
                const insertItem = db.prepare(
                    `INSERT INTO box_items (id, box_id, name, normalized_name, quantity, category) VALUES (?, ?, ?, ?, ?, ?)`
                );
                for (const item of normalizedItems) {
                    insertItem.run(uuidv4(), boxId, item.name, item.normalized_name, item.quantity, item.category);
                }

                // 4. Log event
                db.prepare(
                    `INSERT INTO box_events (id, box_id, event_type, payload, created_at) VALUES (?, ?, 'created', ?, ?)`
                ).run(uuidv4(), boxId, JSON.stringify({ item_count: normalizedItems.length }), now);
            });
        } catch (err: any) {
            console.error('[Boxes] Transaction failed:', err);
            if (body.imageUrls?.length > 0) {
                await deleteFiles(body.imageUrls);
            }
            throw Errors.internal('Failed to create box');
        }

        const data = await getBoxWithDetails(boxId);
        return c.json(buildSuccessResponse(data), 201);
    }
);

// ─── PUT /:id — Update box ──────────────────────────
app.put(
    '/:id',
    rateLimit(30),
    authMiddleware(),
    validateParams(BoxIdParamSchema),
    validateBody(UpdateBoxSchema),
    async (c) => {
        const { id } = (c as any).get('validatedParams');
        const body = (c as any).get('validatedBody');
        const now = new Date().toISOString();
        const db = getDb();

        const existing = queryOne(db, 'SELECT * FROM boxes WHERE id = ?', [id]);
        if (!existing) throw Errors.notFound('Box', id);

        // Build dynamic UPDATE
        const updates: string[] = ['updated_at = ?'];
        const params: any[] = [now];

        if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title); }
        if (body.location !== undefined) { updates.push('location = ?'); params.push(body.location); }
        if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes); }
        if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status); }

        params.push(id);
        db.prepare(`UPDATE boxes SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        // Log event — only record changed field names, not values (avoids storing sensitive notes)
        db.prepare(
            `INSERT INTO box_events (id, box_id, event_type, payload, created_at) VALUES (?, ?, 'updated', ?, ?)`
        ).run(uuidv4(), id, JSON.stringify({ fields: Object.keys(body) }), now);

        const updated = queryOne(db, 'SELECT * FROM boxes WHERE id = ?', [id]);
        return c.json(buildSuccessResponse(updated));
    }
);

// ─── DELETE /:id — Soft delete box ──────────────────
// Gorev 3: Gerçek silme yerine status = 'deleted' olarak işaretle.
// box_images ve box_items kayıtları korunur (kutu recover edilebilir kalır).
app.delete(
    '/:id',
    rateLimit(20),
    authMiddleware(),
    validateParams(BoxIdParamSchema),
    async (c) => {
        const { id } = (c as any).get('validatedParams');
        const db = getDb();

        const existing = queryOne(db, "SELECT * FROM boxes WHERE id = ? AND status != 'deleted'", [id]);
        if (!existing) throw Errors.notFound('Box', id);

        const now = new Date().toISOString();

        runTransaction(db, () => {
            // Log deletion event
            db.prepare(
                `INSERT INTO box_events (id, box_id, event_type, payload, created_at) VALUES (?, ?, 'deleted', ?, ?)`
            ).run(uuidv4(), id, JSON.stringify({ title: (existing as any).title }), now);

            // Soft delete: mark as deleted instead of removing the row
            db.prepare(
                `UPDATE boxes SET status = 'deleted', updated_at = ? WHERE id = ?`
            ).run(now, id);
        });

        return c.json(buildSuccessResponse({ deleted: true, id }));
    }
);

export default app;
