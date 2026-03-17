// BoxScan — Boxes Routes (CRUD + Search/Filter) — sql.js version

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

const app = new Hono();

// ─── Helper: Fetch box with images + items ──────────
async function getBoxWithDetails(boxId: string) {
    const db = await getDb();
    const box = queryOne(db, 'SELECT * FROM boxes WHERE id = ?', [boxId]);
    if (!box) return null;

    const images = queryAll(db, 'SELECT * FROM box_images WHERE box_id = ? ORDER BY is_primary DESC, id ASC', [boxId]);
    const items = queryAll(db, 'SELECT * FROM box_items WHERE box_id = ?', [boxId]);
    const primaryImg = images.find((img: any) => img.is_primary) || images[0] || null;
    const primary_image_url = primaryImg
        ? (primaryImg.image_url.startsWith('http') ? primaryImg.image_url : primaryImg.image_url)
        : null;

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

        const db = await getDb();
        const boxList = queryAll(db, `SELECT * FROM boxes WHERE status != 'deleted'`);
        if (boxList.length === 0) {
            return c.json(buildSuccessResponse({ query: q, results: [], provider: 'mock' }));
        }

        const boxesWithDetails = boxList.map((box: any) => {
            const images = queryAll(db, 'SELECT * FROM box_images WHERE box_id = ?', [box.id]);
            const items = queryAll(db, 'SELECT * FROM box_items WHERE box_id = ?', [box.id]);
            return {
                id: box.id,
                title: box.title,
                location: box.location,
                summary: box.summary ?? '',
                items: items.map((i: any) => ({ name: i.name })),
            };
        });

        const AI_PROVIDER = process.env.AI_PROVIDER || 'mock';

        if (AI_PROVIDER === 'gemini') {
            const apiKey = process.env.GEMINI_API_KEY;
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

                const result = await model.generateContent(prompt);
                const text = result.response.text();
                let jsonStr = text.trim();
                const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch) jsonStr = jsonMatch[1].trim();
                const parsed = JSON.parse(jsonStr);
                const results = Array.isArray(parsed.results) ? parsed.results : [];

                const orderMap = { high: 0, medium: 1, low: 2 };
                results.sort((a: any, b: any) => (orderMap[a.relevance] ?? 3) - (orderMap[b.relevance] ?? 3));

                const output: any[] = [];
                for (const r of results) {
                    const full = await getBoxWithDetails(r.boxId);
                    if (full) {
                        output.push({
                            box: full,
                            relevance: r.relevance || 'medium',
                            reason: r.reason || '',
                        });
                    }
                }
                return c.json(buildSuccessResponse({ query: q, results: output, provider: 'gemini' }));
            } catch (err: any) {
                console.error('[SmartSearch] Gemini error:', err);
                return c.json(buildSuccessResponse({ query: q, results: [], provider: 'gemini' }));
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
        const output: any[] = [];
        for (const m of matches) {
            const full = await getBoxWithDetails(m.boxId);
            if (full) {
                output.push({ box: full, relevance: m.relevance, reason: m.reason });
            }
        }
        return c.json(buildSuccessResponse({ query: q, results: output, provider: 'mock' }));
    }
);

// ─── GET / — List boxes with search/filter ──────────
app.get(
    '/',
    rateLimit(60),
    authMiddleware(),
    validateQuery(BoxListQuerySchema),
    async (c) => {
        const query = c.get('validatedQuery') as any;
        const { search, category, location, status, limit, offset, sort, order } = query;
        const db = await getDb();

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

        // Search (title + item names)
        if (search) {
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

        const data = boxList.map((box: any) => {
            const images = queryAll(db, 'SELECT * FROM box_images WHERE box_id = ? ORDER BY is_primary DESC, id ASC', [box.id]);
            const items = queryAll(db, 'SELECT * FROM box_items WHERE box_id = ?', [box.id]);
            const primaryImg = images.find((img: any) => img.is_primary) || images[0] || null;
            const primary_image_url = primaryImg
                ? (primaryImg.image_url.startsWith('http') ? primaryImg.image_url : primaryImg.image_url)
                : null;
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
        const { id } = c.get('validatedParams') as any;
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
        const body = c.get('validatedBody') as any;
        const now = new Date().toISOString();
        const boxId = uuidv4();
        const db = await getDb();

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
                db.run(
                    `INSERT INTO boxes (id, title, qr_code, location, notes, status, source, created_at, updated_at, damage_flag, damage_notes, hazard_flag, hazard_notes, summary)
           VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [boxId, body.title || null, qrString, body.location || null, body.notes || null, body.source || 'mixed', now, now, damageFlag, body.damage_notes ?? null, hazardFlag, body.hazard_notes ?? null, body.summary ?? null]
                );

                // 2. Create images
                for (let i = 0; i < (body.imageUrls || []).length; i++) {
                    db.run(
                        `INSERT INTO box_images (id, box_id, image_url, is_primary) VALUES (?, ?, ?, ?)`,
                        [uuidv4(), boxId, body.imageUrls[i], i === (body.primaryImageIndex ?? 0) ? 1 : 0]
                    );
                }

                // 3. Create items
                for (const item of normalizedItems) {
                    db.run(
                        `INSERT INTO box_items (id, box_id, name, normalized_name, quantity, category) VALUES (?, ?, ?, ?, ?, ?)`,
                        [uuidv4(), boxId, item.name, item.normalized_name, item.quantity, item.category]
                    );
                }

                // 4. Log event
                db.run(
                    `INSERT INTO box_events (id, box_id, event_type, payload, created_at) VALUES (?, ?, 'created', ?, ?)`,
                    [uuidv4(), boxId, JSON.stringify({ item_count: normalizedItems.length }), now]
                );
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
        const { id } = c.get('validatedParams') as any;
        const body = c.get('validatedBody') as any;
        const now = new Date().toISOString();
        const db = await getDb();

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
        db.run(`UPDATE boxes SET ${updates.join(', ')} WHERE id = ?`, params);

        // Log event — only record changed field names, not values (avoids storing sensitive notes)
        db.run(
            `INSERT INTO box_events (id, box_id, event_type, payload, created_at) VALUES (?, ?, 'updated', ?, ?)`,
            [uuidv4(), id, JSON.stringify({ fields: Object.keys(body) }), now]
        );

        const updated = queryOne(db, 'SELECT * FROM boxes WHERE id = ?', [id]);
        return c.json(buildSuccessResponse(updated));
    }
);

// ─── DELETE /:id — Delete box (transaction) ─────────
app.delete(
    '/:id',
    rateLimit(20),
    authMiddleware(),
    validateParams(BoxIdParamSchema),
    async (c) => {
        const { id } = c.get('validatedParams') as any;
        const db = await getDb();

        const existing = queryOne(db, 'SELECT * FROM boxes WHERE id = ?', [id]);
        if (!existing) throw Errors.notFound('Box', id);

        // Get images for file cleanup
        const images = queryAll(db, 'SELECT image_url FROM box_images WHERE box_id = ?', [id]);
        const imageUrls = images.map((img: any) => img.image_url);

        runTransaction(db, () => {
            // Log deletion event
            db.run(
                `INSERT INTO box_events (id, box_id, event_type, payload, created_at) VALUES (?, ?, 'deleted', ?, ?)`,
                [uuidv4(), id, JSON.stringify({ title: existing.title }), new Date().toISOString()]
            );

            // Delete box (cascade removes images, items, events)
            db.run('DELETE FROM boxes WHERE id = ?', [id]);
        });

        // Cleanup files
        await deleteFiles(imageUrls);

        return c.json(buildSuccessResponse({ deleted: true, id }));
    }
);

export default app;
