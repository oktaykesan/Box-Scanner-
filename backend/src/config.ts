// BoxScan — Backend Environment Configuration
//
// Single source of truth for all environment variables.
// Import `config` from this module instead of reading process.env directly.
//
// TODO: Replace all direct process.env.X references in other files with
//       imports from this module:
//         import { config } from './config.js';
//       Affected files (as of initial implementation):
//         - src/index.ts        (CORS_ORIGINS, PORT, AI_PROVIDER, STORAGE_PROVIDER)
//         - src/middleware/auth.ts  (API_SHARED_SECRET)
//         - src/routes/analyze.ts  (or services) — AI_PROVIDER, GEMINI_API_KEY, AI_GATEWAY_URL
//         - src/services/*      — UPLOAD_DIR, MAX_UPLOAD_MB, STORAGE_PROVIDER

import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Schema ──────────────────────────────────────────────────────────────────

const envSchema = z.object({
    // Server
    PORT: z
        .string()
        .default('3000')
        .transform((v) => parseInt(v, 10))
        .pipe(z.number().int().min(1).max(65535)),

    APP_BASE_URL: z
        .string()
        .url({ message: 'APP_BASE_URL must be a valid URL (e.g. http://localhost:3000)' }),

    // Storage
    STORAGE_PROVIDER: z
        .enum(['local'], {
            errorMap: () => ({ message: 'STORAGE_PROVIDER must be "local"' }),
        })
        .default('local'),

    UPLOAD_DIR: z.string().min(1).default('./uploads'),

    // AI
    AI_PROVIDER: z
        .enum(['mock', 'gemini', 'local'], {
            errorMap: () => ({
                message: 'AI_PROVIDER must be one of: mock | gemini | local',
            }),
        })
        .default('mock'),

    GEMINI_API_KEY: z.string().optional(),

    GEMINI_MODEL: z.string().optional(),

    AI_GATEWAY_URL: z
        .string()
        .url({ message: 'AI_GATEWAY_URL must be a valid URL when provided' })
        .optional()
        .or(z.literal('')),

    // Upload limits
    MAX_UPLOAD_MB: z
        .string()
        .default('10')
        .transform((v) => parseInt(v, 10))
        .pipe(z.number().int().min(1).max(500)),

    // Auth
    API_SHARED_SECRET: z
        .string()
        .min(16, { message: 'API_SHARED_SECRET must be at least 16 characters' }),

    // CORS — comma-separated list of allowed origins
    CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),

    // Database
    DB_PATH: z.string().optional(),
});

// ─── Validation ──────────────────────────────────────────────────────────────

function parseEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const issues = result.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');

        console.error('[FATAL] Invalid environment configuration:\n' + issues);
        console.error('\nCheck your .env file against backend/.env.example');
        process.exit(1);
    }

    return result.data;
}

// ─── Derived helpers ─────────────────────────────────────────────────────────

function buildConfig(env: z.infer<typeof envSchema>) {
    const corsOrigins = env.CORS_ORIGINS.split(',')
        .map((o) => o.trim())
        .filter(Boolean);

    return {
        port: env.PORT,
        appBaseUrl: env.APP_BASE_URL,
        storage: {
            provider: env.STORAGE_PROVIDER,
            uploadDir: env.UPLOAD_DIR,
        },
        ai: {
            provider: env.AI_PROVIDER,
            geminiApiKey: env.GEMINI_API_KEY,
            gatewayUrl: env.AI_GATEWAY_URL || undefined,
            geminiModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
        },
        db: {
            path: env.DB_PATH || path.resolve(__dirname, '../../boxscan.db'),
        },
        upload: {
            maxMb: env.MAX_UPLOAD_MB,
        },
        auth: {
            sharedSecret: env.API_SHARED_SECRET,
        },
        cors: {
            origins: corsOrigins,
        },
    };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const config = buildConfig(parseEnv());

export type Config = typeof config;
