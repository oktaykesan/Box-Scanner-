// BoxScan — Request Validation Helpers

import type { Context, Next } from 'hono';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { Errors } from './errors.js';

/**
 * Validate request body against a Zod schema.
 * Throws AppError(VALIDATION_ERROR) on failure.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
    return async (c: Context, next: Next) => {
        try {
            const body = await c.req.json();
            const parsed = schema.parse(body);
            c.set('validatedBody', parsed);
            await next();
        } catch (err) {
            if (err instanceof ZodError) {
                throw Errors.validation('Request body validation failed', formatZodErrors(err));
            }
            if (err instanceof SyntaxError) {
                throw Errors.badRequest('Invalid JSON body');
            }
            throw err;
        }
    };
}

/**
 * Validate URL params against a Zod schema.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return async (c: Context, next: Next) => {
        try {
            const params = c.req.param();
            const parsed = schema.parse(params);
            c.set('validatedParams', parsed);
            await next();
        } catch (err) {
            if (err instanceof ZodError) {
                throw Errors.validation('URL parameter validation failed', formatZodErrors(err));
            }
            throw err;
        }
    };
}

/**
 * Validate query string against a Zod schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return async (c: Context, next: Next) => {
        try {
            const query = c.req.query();
            const parsed = schema.parse(query);
            c.set('validatedQuery', parsed);
            await next();
        } catch (err) {
            if (err instanceof ZodError) {
                throw Errors.validation('Query parameter validation failed', formatZodErrors(err));
            }
            throw err;
        }
    };
}

/**
 * Format Zod errors into a readable structure.
 */
function formatZodErrors(err: ZodError): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    for (const issue of err.issues) {
        const path = issue.path.join('.') || '_root';
        if (!formatted[path]) formatted[path] = [];
        formatted[path].push(issue.message);
    }
    return formatted;
}
