// BoxScan — Auth Middleware (Shared Secret)

import { timingSafeEqual } from 'crypto';
import type { Context, Next } from 'hono';
import { config } from '../config.js';
import { Errors } from '../lib/errors.js';

/**
 * Shared-secret authentication middleware.
 * Checks `x-api-key` or `Authorization: Bearer <token>` header.
 * FAIL-CLOSED: if API_SHARED_SECRET is not configured, ALL requests are rejected.
 */
export function authMiddleware() {
    return async (c: Context, next: Next) => {
        const secret = config.auth.sharedSecret;

        // Fail-closed: never bypass auth if the secret is missing or empty
        if (!secret || secret.trim() === '') {
            throw Errors.internal('Server authentication is not configured');
        }

        const apiKey = c.req.header('x-api-key');
        const authHeader = c.req.header('authorization');
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

        const providedKey = apiKey || bearerToken;

        if (!providedKey) {
            throw Errors.unauthorized('Invalid or missing API key');
        }

        const providedKeyBuf = Buffer.from(providedKey);
        const secretBuf = Buffer.from(secret);
        const keysMatch =
            providedKeyBuf.length === secretBuf.length &&
            timingSafeEqual(providedKeyBuf, secretBuf);

        if (!keysMatch) {
            throw Errors.unauthorized('Invalid or missing API key');
        }

        await next();
    };
}

/**
 * Call at server startup to ensure API_SHARED_SECRET is configured.
 * Throws a fatal error and prevents the server from starting if missing.
 */
export function assertAuthConfigured(): void {
    const secret = config.auth.sharedSecret;
    if (!secret || secret.trim() === '') {
        console.error('[FATAL] API_SHARED_SECRET environment variable is not set. Server cannot start.');
        process.exit(1);
    }
    if (secret.length < 16) {
        console.warn('[SECURITY] API_SHARED_SECRET is shorter than 16 characters. Use a stronger secret.');
    }
}
