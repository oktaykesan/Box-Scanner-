// BoxScan — API Client (fetch wrapper, timeout 30s, multipart helper)

import { Config } from '../constants/config';

const BASE_URL = Config.API_BASE_URL;
const TIMEOUT = Config.REQUEST_TIMEOUT;

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
}

function isNetworkError(err: unknown): boolean {
    return err instanceof TypeError && (err as TypeError).message.includes('Network request failed');
}

/**
 * Base fetch wrapper with timeout, error handling, and optional retry.
 */
async function request<T>(
    path: string,
    options: RequestInit = {},
    retries = 2
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': Config.API_KEY,
                ...options.headers,
            },
        });

        const json: ApiResponse<T> = await response.json();

        if (!json.success) {
            throw new Error(json.error?.message || `Request failed: ${response.status}`);
        }

        return json.data as T;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        if (retries > 0 && isNetworkError(err)) {
            await new Promise(r => setTimeout(r, 1000));
            return request<T>(path, options, retries - 1);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ─── Box Types (simplified for mobile) ──────────────
export interface BoxItem {
    id: string;
    name: string;
    quantity: number;
    category: string;
}

export interface BoxImage {
    id: string;
    image_url: string;
    is_primary: boolean;
}

export interface Box {
    id: string;
    title: string | null;
    qr_code: string;
    location: string | null;
    notes: string | null;
    status: string;
    last_scanned_at: string | null;
    created_at: string;
    updated_at: string;
    images: BoxImage[];
    items: BoxItem[];
    item_count: number;
    primary_image_url: string | null;
    damage_flag?: boolean;
    damage_notes?: string | null;
    hazard_flag?: boolean;
    hazard_notes?: string | null;
    summary?: string | null;
}

export interface AnalyzeResult {
    imageUrl: string;
    imageUrls?: string[];
    items: { name: string; quantity: number; category: string }[];
    suggested_title?: string;
    suggested_location?: string;
    damage_flag?: boolean;
    damage_notes?: string | null;
    hazard_flag?: boolean;
    hazard_notes?: string | null;
    confidence?: number;
    analysisNotes?: string;
    summary?: string;
    analysisMeta: { provider: string; status: string; runId: string };
}

export interface QRResult {
    qrCodeDataUrl: string;
    payload: any;
}

// ─── API Methods ────────────────────────────────────

/** Get list of boxes with optional filters */
export async function getBoxes(params?: {
    search?: string;
    category?: string;
    location?: string;
    limit?: number;
    offset?: number;
}): Promise<{ boxes: Box[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.location) searchParams.set('location', params.location);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const qs = searchParams.toString();
    return request(`/api/boxes${qs ? `?${qs}` : ''}`);
}

/** Get single box by ID */
export async function getBox(id: string): Promise<Box> {
    return request(`/api/boxes/${id}`);
}

/** Create a new box */
export async function createBox(data: {
    title?: string;
    location?: string;
    notes?: string;
    items: { name: string; quantity: number; category: string }[];
    imageUrls: string[];
    damage_flag?: boolean;
    damage_notes?: string | null;
    hazard_flag?: boolean;
    hazard_notes?: string | null;
    summary?: string | null;
}): Promise<Box> {
    return request('/api/boxes', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/** Update box */
export async function updateBox(id: string, data: {
    title?: string;
    location?: string;
    notes?: string;
    status?: string;
}): Promise<Box> {
    return request(`/api/boxes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/** Delete box */
export async function deleteBox(id: string): Promise<void> {
    return request(`/api/boxes/${id}`, { method: 'DELETE' });
}

/** Analyze images (multipart upload) — no retry: long-running AI operation */
export async function analyzeImage(imageUris: string[], externalSignal?: AbortSignal): Promise<AnalyzeResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    if (externalSignal) {
        externalSignal.addEventListener('abort', () => controller.abort());
    }

    try {
        const formData = new FormData();

        for (const uri of imageUris) {
            const filename = uri.split('/').pop() || 'capture.jpg';
            formData.append('images', {
                uri,
                name: filename,
                type: 'image/jpeg',
            } as any);
        }

        const response = await fetch(`${BASE_URL}/api/analyze`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            headers: { 'x-api-key': Config.API_KEY },
        });

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error?.message || 'Analysis failed');
        }
        return json.data;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            if (externalSignal?.aborted) throw err;
            throw new Error('İstek zaman aşımına uğradı');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Upload images only (no AI) — no retry: long-running upload operation */
export async function uploadImages(imageUris: string[], externalSignal?: AbortSignal): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    if (externalSignal) {
        externalSignal.addEventListener('abort', () => controller.abort());
    }

    try {
        const formData = new FormData();
        for (const uri of imageUris) {
            const filename = uri.split('/').pop() || 'capture.jpg';
            formData.append('images', {
                uri,
                name: filename,
                type: 'image/jpeg',
            } as any);
        }

        const response = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            headers: { 'x-api-key': Config.API_KEY },
        });

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error?.message || 'Upload failed');
        }
        return json.data.imageUrls;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            if (externalSignal?.aborted) throw err;
            throw new Error('İstek zaman aşımına uğradı');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Get QR code for a box */
export async function getQR(boxId: string): Promise<QRResult> {
    return request(`/api/qr/${boxId}`);
}

/** Smart search (semantic / AI) */
export async function smartSearchBoxes(query: string): Promise<{
    query: string;
    results: { box: Box; relevance: string; reason: string }[];
    provider: string;
}> {
    const qs = new URLSearchParams({ q: query });
    return request(`/api/boxes/search/smart?${qs}`);
}

/** Scan a box (update last_scanned_at) */
export async function scanBox(boxId: string): Promise<Box> {
    return request('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ boxId }),
    });
}
