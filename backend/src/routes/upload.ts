// BoxScan — Upload Route (Sadece Fotoğraf Yükleme, AI Yok)

import { Hono } from 'hono';
import { saveFile } from '../services/storage.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { buildSuccessResponse, Errors } from '../lib/errors.js';
import { config } from '../config.js';
import { validateMagicBytes } from '../lib/magicBytes.js';

const app = new Hono();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = config.upload.maxMb * 1024 * 1024;

app.post(
    '/',
    rateLimit(20),
    authMiddleware(),
    async (c) => {
        console.log('[Upload] İstek alındı');
        const formData = await c.req.formData();
        const files = [...formData.getAll('image'), ...formData.getAll('images')];
        const validFiles: File[] = [];

        for (const f of files) {
            if (f instanceof File) {
                validFiles.push(f);
            }
        }

        if (validFiles.length === 0) {
            throw Errors.badRequest('Yüklenecek dosya bulunamadı.');
        }

        const imageUrls: string[] = [];

        for (const file of validFiles) {
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                console.warn(`[Upload] Geçersiz tip "${file.type}" atlandı.`);
                continue;
            }

            if (file.size > MAX_UPLOAD_BYTES) {
                console.warn(`[Upload] Dosya çok büyük (${file.size} bayt) atlandı.`);
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
            
            imageUrls.push(imageUrl);
        }

        if (imageUrls.length === 0) {
            throw Errors.badRequest('Geçerli hiçbir resim kaydedilemedi.');
        }

        return c.json(buildSuccessResponse({ imageUrls }));
    }
);

export default app;
