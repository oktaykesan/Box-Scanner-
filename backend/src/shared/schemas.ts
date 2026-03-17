// BoxScan — Shared Zod Schemas
// Runtime validation schemas used primarily by backend, importable by mobile

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────
export const BoxStatusSchema = z.enum(['active', 'archived', 'deleted']);
export const AnalysisProviderSchema = z.enum(['gemini', 'local', 'mock']);
export const AnalysisStatusSchema = z.enum(['success', 'parse_error', 'failed']);
export const BoxEventTypeSchema = z.enum(['created', 'updated', 'scanned', 'deleted']);
export const SortFieldSchema = z.enum(['created_at', 'updated_at', 'last_scanned_at', 'title']);
export const SortOrderSchema = z.enum(['asc', 'desc']);

// ─── Detected Item ─────────────────────────────────
export const DetectedItemSchema = z.object({
    name: z.string().min(1).max(200),
    quantity: z.number().int().min(0).default(1),
    category: z.string().max(100).default('uncategorized'),
    condition: z.enum(["iyi", "hasarlı", "belirsiz"]).optional(),
});

// ─── Create Box ─────────────────────────────────────
export const CreateBoxSchema = z.object({
    title: z.string().max(200).nullish(),
    location: z.string().max(500).nullish(),
    notes: z.string().max(2000).nullish(),
    source: z.string().max(50).default('mixed'),
    items: z.array(DetectedItemSchema).min(0).max(200),
    // Only allow paths returned by the upload endpoint — blocks SSRF and external tracking URLs
    imageUrls: z.array(z.string().startsWith('/uploads/')).min(0).max(20),
    primaryImageIndex: z.number().int().min(0).optional(),
    damage_flag: z.boolean().optional(),
    damage_notes: z.string().max(500).nullish().optional(),
    hazard_flag: z.boolean().optional(),
    hazard_notes: z.string().max(500).nullish().optional(),
    summary: z.string().max(1000).nullish().optional(),
});

// ─── Update Box ─────────────────────────────────────
export const UpdateBoxSchema = z.object({
    title: z.string().max(200).nullish(),
    location: z.string().max(500).nullish(),
    notes: z.string().max(2000).nullish(),
    status: BoxStatusSchema.optional(),
});

// ─── Scan ───────────────────────────────────────────
export const ScanPayloadSchema = z.object({
    boxId: z.string().uuid(),
});

// ─── Box List Query ─────────────────────────────────
export const BoxListQuerySchema = z.object({
    search: z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    location: z.string().max(500).optional(),
    status: BoxStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    sort: SortFieldSchema.default('created_at'),
    order: SortOrderSchema.default('desc'),
});

// ─── Params ─────────────────────────────────────────
export const BoxIdParamSchema = z.object({
    id: z.string().uuid(),
});

export const BoxIdForQRParamSchema = z.object({
    boxId: z.string().uuid(),
});

// ─── Type inference helpers ─────────────────────────
export type CreateBoxInput = z.infer<typeof CreateBoxSchema>;
export type UpdateBoxInput = z.infer<typeof UpdateBoxSchema>;
export type ScanPayloadInput = z.infer<typeof ScanPayloadSchema>;
export type BoxListQueryInput = z.infer<typeof BoxListQuerySchema>;
