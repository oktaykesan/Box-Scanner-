// BoxScan — Analyze Route (Image Upload → AI Analysis) — no sharp

import { Hono } from 'hono';
import { analyzeImages } from '../services/ai.js';
import { saveFile, deleteFiles } from '../services/storage.js';
import { normalizeItems } from '../services/items.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { buildSuccessResponse, Errors } from '../lib/errors.js';
import { config } from '../config.js';
import { validateMagicBytes } from '../lib/magicBytes.js';
import type { AnalyzeResponse } from '../shared/types.js';

const app = new Hono();

// Allowed MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = config.upload.maxMb * 1024 * 1024;

/**
 * POST /api/analyze
 * Accepts multipart/form-data with an image file.
 * Saves image, sends to AI, returns detected items.
 */
app.post(
    '/',
    rateLimit(10),
    authMiddleware(),
    async (c) => {
        console.log('[Analyze] İstek alındı');
        const formData = await c.req.formData();
        const files = [...formData.getAll('image'), ...formData.getAll('images')];
        const validFiles: File[] = [];

        for (const f of files) {
            if (f instanceof File) {
                validFiles.push(f);
            }
        }

        if (validFiles.length === 0) {
            throw Errors.badRequest('Missing image files in form data');
        }

        const imagesToAnalyze = [];
        const savedImageUrls: string[] = [];
        let primaryImageUrl = '';

        for (const file of validFiles) {
            console.log('[Analyze] File type:', file.type, 'size:', file.size);

            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                console.warn(`[Analyze] Invalid image type "${file.type}" skipped.`);
                continue;
            }

            if (file.size > MAX_UPLOAD_BYTES) {
                console.warn(`[Analyze] Image too large (${file.size} bytes) skipped.`);
                continue;
            }

            const arrayBuffer = await file.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            // Magic byte validation — prevents MIME type spoofing via client-controlled headers
            if (!validateMagicBytes(imageBuffer)) {
                throw Errors.badRequest(
                    `File "${file.name || 'unknown'}" failed magic byte validation. ` +
                    'Only JPEG, PNG, WebP, and HEIC/HEIF images are accepted.'
                );
            }

            const imageUrl = await saveFile(imageBuffer, file.name || 'capture.jpg', file.type);

            if (!primaryImageUrl) primaryImageUrl = imageUrl;
            savedImageUrls.push(imageUrl);

            imagesToAnalyze.push({ buffer: imageBuffer, mimeType: file.type });
        }

        if (imagesToAnalyze.length === 0) {
            throw Errors.badRequest('No valid allowed images uploaded after validation');
        }

        // AI Analysis — wrap in try-catch to delete orphan files on failure
        let result;
        try {
            result = await analyzeImages(imagesToAnalyze);
        } catch (err) {
            // Orphan dosyaları temizle
            await deleteFiles(savedImageUrls).catch(() => {});
            throw err; // hatayı yukarıya ilet
        }

        console.log('[Analyze] AI result status:', result.meta.status);
        console.log('[Analyze] AI items count:', result.items.length);
        console.log('[Analyze] AI error:', result.meta);

        // Normalize items
        const normalizedItems = normalizeItems(result.items);

        const response: AnalyzeResponse = {
            imageUrl: primaryImageUrl,
            imageUrls: savedImageUrls,
            items: normalizedItems,
            suggested_title: result.suggested_title ?? '',
            suggested_location: result.suggested_location ?? '',
            damage_flag: result.damage_flag ?? false,
            damage_notes: result.damage_notes ?? null,
            hazard_flag: result.hazard_flag ?? false,
            hazard_notes: result.hazard_notes ?? null,
            confidence: result.confidence,
            analysisNotes: result.analysisNotes,
            summary: result.summary ?? '',
            analysisMeta: result.meta,
        };

        return c.json(buildSuccessResponse(response));
    }
);

export default app;
