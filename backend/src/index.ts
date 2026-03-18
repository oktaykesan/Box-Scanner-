// BoxScan — Server Entry Point
import 'dotenv/config';
import { config } from './config.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { serveStatic } from '@hono/node-server/serve-static';

import { globalErrorHandler, buildSuccessResponse, Errors } from './lib/errors.js';
import { runMigrations } from './db/migrate.js';
import { assertAuthConfigured } from './middleware/auth.js';
import boxesRoutes from './routes/boxes.js';
import analyzeRoutes from './routes/analyze.js';
import qrRoutes from './routes/qr.js';
import scanRoutes from './routes/scan.js';
import uploadRoutes from './routes/upload.js';

const app = new Hono();

// ─── CORS ───────────────────────────────────────────
const corsOrigins = config.cors.origins;

app.use('/*', cors({
    origin: corsOrigins.length === 1 && corsOrigins[0] === '*'
        ? '*'
        : corsOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    maxAge: 86400,
}));

// ─── Static file serving for uploads ────────────────
// Block path traversal attempts before reaching serveStatic
app.use('/uploads/*', async (c, next) => {
    const reqPath = c.req.path;
    if (reqPath.includes('..') || reqPath.includes('%2e') || reqPath.includes('%2E')) {
        throw Errors.badRequest('Invalid path');
    }
    c.header('Content-Disposition', 'attachment');
    c.header('X-Content-Type-Options', 'nosniff');
    await next();
});
app.use('/uploads/*', serveStatic({ root: './' }));

// ─── Root welcome page ─────────────────────────────
app.get('/', (c) => {
    return c.html(`<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>📦 BoxScan API</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f0f1a;color:#f0f0f5;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;display:flex;justify-content:center;align-items:center}.card{background:#1a1a2e;border:1px solid #2a2a45;border-radius:16px;padding:40px;max-width:500px;width:90%;text-align:center}h1{font-size:28px;margin-bottom:8px}.sub{color:#a0a0b8;margin-bottom:24px}.badge{display:inline-block;background:#ff6b3520;color:#ff6b35;padding:4px 12px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:24px}.endpoints{text-align:left}.endpoints a{display:block;color:#4cc9f0;text-decoration:none;padding:8px 12px;margin:4px 0;border-radius:8px;background:#252542;font-family:monospace;font-size:14px}.endpoints a:hover{background:#35355a}.footer{margin-top:24px;color:#6b6b85;font-size:12px}</style></head>
<body><div class="card"><h1>📦 BoxScan API</h1><p class="sub">QR tabanlı depo içerik yönetim sistemi</p><div class="badge">v1.0.0</div>
<div class="endpoints"><a href="/api/health">GET /api/health</a><a href="/api/boxes">GET /api/boxes</a></div>
<p class="footer">POST: /api/boxes · /api/analyze · /api/scan · GET: /api/qr/:boxId</p></div></body></html>`);
});

// ─── Security headers ────────────────────────────────
app.use('/uploads/*', secureHeaders());
app.use('/api/*', secureHeaders());
app.use('/', secureHeaders());

// ─── Health check ───────────────────────────────────
app.get('/api/health', (c) => {
    return c.json(buildSuccessResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
    }));
});

// ─── Mount routes ───────────────────────────────────
app.route('/api/boxes', boxesRoutes);
app.route('/api/analyze', analyzeRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/qr', qrRoutes);
app.route('/api/scan', scanRoutes);

// ─── Global error handler ───────────────────────────
app.onError(globalErrorHandler);

// ─── 404 catch-all ──────────────────────────────────
app.notFound((c) => {
    return c.json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${c.req.method} ${c.req.path} not found`,
        },
    }, 404);
});

// ─── Request access log ──────────────────────────────
app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(JSON.stringify({
        time: Date.now(),
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms,
    }));
});

// ─── Start server ───────────────────────────────────
async function start() {
    // Fail fast if auth is not configured (prevents fail-open deployments)
    assertAuthConfigured();

    // Run migrations before starting
    await runMigrations();

    const server = serve({
        fetch: app.fetch,
        port: config.port,
    }, (info) => {
        console.log('');
        console.log('╔══════════════════════════════════════════╗');
        console.log('║     BoxScan API Server                  ║');
        console.log('╠══════════════════════════════════════════╣');
        console.log(`║  Port:     ${String(info.port).padEnd(29)}║`);
        console.log(`║  AI:       ${config.ai.provider.padEnd(29)}║`);
        console.log(`║  Storage:  ${config.storage.provider.padEnd(29)}║`);
        console.log('╚══════════════════════════════════════════╝');
        console.log('');
    });

    const shutdown = async (signal: string) => {
        console.log(`[Server] ${signal} received, shutting down...`);
        server.close(() => {
            import('./db/index.js').then(({ getDb }) => {
                getDb().close();
                process.exit(0);
            }).catch(() => process.exit(0));
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

export default app;
