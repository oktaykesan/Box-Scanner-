// BoxScan — Rate Limiting Middleware (In-Memory Sliding Window)

import type { Context, Next } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { Errors, buildErrorResponse } from '../lib/errors.js';

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter((t) => now - t < 120_000);
        if (entry.timestamps.length === 0) store.delete(key);
    }
}, 5 * 60 * 1000);

/**
 * Create a rate limiting middleware.
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default 60s)
 */
export function rateLimit(maxRequests: number, windowMs: number = 60_000) {
    return async (c: Context, next: Next) => {
        // Use actual connection remote address — never trust client-supplied X-Forwarded-For
        let ip: string;
        try {
            const connInfo = getConnInfo(c);
            ip = connInfo.remote.address || 'unknown';
        } catch {
            ip = 'unknown';
        }
        const route = c.req.path;
        const key = `${ip}:${route}`;
        const now = Date.now();

        let entry = store.get(key);
        if (!entry) {
            entry = { timestamps: [] };
            store.set(key, entry);
        }

        // Remove expired timestamps
        entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

        if (entry.timestamps.length >= maxRequests) {
            const oldestInWindow = entry.timestamps[0];
            const retryAfterMs = windowMs - (now - oldestInWindow);
            const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

            c.header('Retry-After', String(retryAfterSeconds));
            c.header('X-RateLimit-Limit', String(maxRequests));
            c.header('X-RateLimit-Remaining', '0');

            const error = Errors.rateLimited(retryAfterSeconds);
            return c.json(buildErrorResponse(error), 429);
        }

        entry.timestamps.push(now);

        c.header('X-RateLimit-Limit', String(maxRequests));
        c.header('X-RateLimit-Remaining', String(maxRequests - entry.timestamps.length));

        await next();
    };
}
