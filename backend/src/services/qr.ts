// BoxScan — QR Code Service (Versioned Payload + Size Optimization)

import QRCode from 'qrcode';
import type { QRPayload } from '../shared/types.js';

const MAX_NAME_LENGTH = 30;
const MAX_ITEM_LENGTH = 20;
const MAX_ITEMS_COUNT = 5;
const MAX_PAYLOAD_BYTES = 300;

/**
 * Build an optimized QR payload for a box.
 * Uses short keys and truncates to stay under ~300 bytes.
 */
export function buildQRPayload(
    boxId: string,
    boxName: string | null,
    itemNames: string[]
): QRPayload {
    const name = truncate(boxName || 'Untitled Box', MAX_NAME_LENGTH);
    let items = itemNames
        .slice(0, MAX_ITEMS_COUNT)
        .map((n) => truncate(n, MAX_ITEM_LENGTH));

    let payload: QRPayload = {
        v: 1,
        id: boxId,
        t: 'box',
        n: name,
        i: items,
    };

    // If payload is too large, progressively reduce items
    while (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES && items.length > 0) {
        items = items.slice(0, -1);
        payload.i = items;
    }

    // If still too large, truncate name more
    if (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) {
        payload.n = truncate(name, 15);
    }

    return payload;
}

/**
 * Generate QR code as a data URL (PNG base64).
 */
export async function generateQRDataUrl(payload: QRPayload): Promise<string> {
    const payloadString = JSON.stringify(payload);
    const dataUrl = await QRCode.toDataURL(payloadString, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: {
            dark: '#000000',
            light: '#FFFFFF',
        },
    });
    return dataUrl;
}

/**
 * Generate QR code as a PNG buffer.
 */
export async function generateQRBuffer(payload: QRPayload): Promise<Buffer> {
    const payloadString = JSON.stringify(payload);
    return await QRCode.toBuffer(payloadString, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
    });
}

/**
 * Truncate a string to max length, adding "…" if needed.
 */
function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 1) + '…';
}
