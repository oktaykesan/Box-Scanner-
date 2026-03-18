// BoxScan — Storage Service (abstracted: local | r2)

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

const STORAGE_PROVIDER = config.storage.provider;
const UPLOAD_DIR = config.storage.uploadDir;

/**
 * Ensure the upload directory exists.
 */
function ensureUploadDir(): void {
    const dir = path.resolve(UPLOAD_DIR);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Save a file buffer to storage.
 * Returns the public URL/path of the saved file.
 */
export async function saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string
): Promise<string> {
    if (STORAGE_PROVIDER === 'r2') {
        // TODO: Phase 02+ — Cloudflare R2 integration
        // Same interface, different implementation
        throw new Error('R2 storage provider not yet implemented');
    }

    // Local storage
    ensureUploadDir();

    const ext = getExtension(mimeType, originalName);
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.resolve(UPLOAD_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    // Return URL path relative to server
    return `/uploads/${filename}`;
}

/**
 * Delete a file from storage.
 * Ignores missing files gracefully, logs warning.
 */
export async function deleteFile(imageUrl: string): Promise<void> {
    if (STORAGE_PROVIDER === 'r2') {
        // TODO: Phase 02+
        console.warn('[Storage] R2 delete not yet implemented');
        return;
    }

    // Local storage
    const filename = imageUrl.replace(/^\/uploads\//, '');
    const resolvedPath = path.resolve(UPLOAD_DIR, filename);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir + path.sep)) {
        throw new Error('Invalid file path');
    }

    try {
        if (fs.existsSync(resolvedPath)) {
            fs.unlinkSync(resolvedPath);
        } else {
            console.warn(`[Storage] File not found, skipping delete: ${resolvedPath}`);
        }
    } catch (err) {
        console.warn(`[Storage] Failed to delete file ${resolvedPath}:`, err);
    }
}

/**
 * Delete multiple files. Best-effort, logs warnings.
 */
export async function deleteFiles(imageUrls: string[]): Promise<void> {
    for (const url of imageUrls) {
        await deleteFile(url);
    }
}

/**
 * Check if a file exists in storage.
 */
export function fileExists(imageUrl: string): boolean {
    if (STORAGE_PROVIDER === 'r2') return false; // TODO

    const filename = imageUrl.replace(/^\/uploads\//, '');
    const resolvedPath = path.resolve(UPLOAD_DIR, filename);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir + path.sep)) {
        return false;
    }
    return fs.existsSync(resolvedPath);
}

/**
 * Get file extension from MIME type or original filename.
 */
function getExtension(mimeType: string, originalName: string): string {
    const mimeMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
    };

    if (mimeMap[mimeType]) return mimeMap[mimeType];

    const ext = path.extname(originalName);
    return ext || '.jpg';
}
