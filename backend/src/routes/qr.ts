// BoxScan — QR Code Route — sql.js version

import { Hono } from 'hono';
import { getDb, queryAll, queryOne } from '../db/index.js';
import { validateParams } from '../lib/validation.js';
import { buildSuccessResponse, Errors } from '../lib/errors.js';
import { BoxIdForQRParamSchema } from '../shared/schemas.js';
import { buildQRPayload, generateQRDataUrl } from '../services/qr.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { authMiddleware } from '../middleware/auth.js';
import type { QRResponse } from '../shared/types.js';

const app = new Hono();

/**
 * GET /api/qr/:boxId
 * Generate QR code as data URL with enriched payload.
 */
app.get(
    '/:boxId',
    rateLimit(60),
    authMiddleware(),
    validateParams(BoxIdForQRParamSchema),
    async (c) => {
        const { boxId } = (c as any).get('validatedParams');
        const db = getDb();

        const box = queryOne(db, 'SELECT * FROM boxes WHERE id = ?', [boxId]);
        if (!box) throw Errors.notFound('Box', boxId);

        const items = queryAll(db, 'SELECT name FROM box_items WHERE box_id = ?', [boxId]);
        const itemNames = items.map((item: any) => item.name);

        const payload = buildQRPayload(boxId, box.title, itemNames);
        const qrCodeDataUrl = await generateQRDataUrl(payload);

        const response: QRResponse = {
            qrCodeDataUrl,
            payload,
        };

        return c.json(buildSuccessResponse(response));
    }
);

export default app;
