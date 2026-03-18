// BoxScan — Centralized Error Handling

import type { Context } from 'hono';
import type { ApiErrorResponse } from '../shared/types.js';

// ─── Error Codes ────────────────────────────────────
export const ErrorCode = {
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    RATE_LIMITED: 'RATE_LIMITED',
    BAD_REQUEST: 'BAD_REQUEST',
    INVALID_IMAGE: 'INVALID_IMAGE',
    IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
    AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── App Error Class ────────────────────────────────
export class AppError extends Error {
    constructor(
        public readonly code: ErrorCodeType,
        message: string,
        public readonly statusCode: number = 500,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }
}

// ─── Factory Helpers ────────────────────────────────
export const Errors = {
    notFound: (resource: string, id?: string) =>
        new AppError(
            ErrorCode.NOT_FOUND,
            id ? `${resource} with id '${id}' not found` : `${resource} not found`,
            404
        ),

    validation: (message: string, details?: unknown) =>
        new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),

    unauthorized: (message = 'Authentication required') =>
        new AppError(ErrorCode.UNAUTHORIZED, message, 401),

    forbidden: (message = 'Access denied') =>
        new AppError(ErrorCode.FORBIDDEN, message, 403),

    rateLimited: (retryAfterSeconds: number) =>
        new AppError(
            ErrorCode.RATE_LIMITED,
            `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`,
            429
        ),

    badRequest: (message: string) =>
        new AppError(ErrorCode.BAD_REQUEST, message, 400),

    invalidImage: (message = 'Invalid image file') =>
        new AppError(ErrorCode.INVALID_IMAGE, message, 400),

    imageTooLarge: (maxMB: number) =>
        new AppError(ErrorCode.IMAGE_TOO_LARGE, `Image exceeds maximum size of ${maxMB}MB`, 413),

    aiServiceError: (message: string) =>
        new AppError(ErrorCode.AI_SERVICE_ERROR, message, 502),

    internal: (message = 'Internal server error') =>
        new AppError(ErrorCode.INTERNAL_ERROR, message, 500),
};

// ─── Error Response Builder ─────────────────────────
export function buildErrorResponse(error: AppError): ApiErrorResponse {
    return {
        success: false,
        error: {
            code: error.code,
            message: error.message,
        },
    };
}

// ─── Success Response Builder ───────────────────────
export function buildSuccessResponse<T>(data: T) {
    return {
        success: true as const,
        data,
    };
}

// ─── Global Error Handler Middleware ─────────────────
export function globalErrorHandler(err: Error, c: Context) {
    console.error(`[ERROR] ${err.message}`, err.stack);

    if (err instanceof AppError) {
        return c.json(buildErrorResponse(err), err.statusCode as any);
    }

    // Unknown errors → 500
    const appError = Errors.internal(
        process.env.NODE_ENV !== 'development' ? 'Internal server error' : err.message
    );
    return c.json(buildErrorResponse(appError), 500);
}
