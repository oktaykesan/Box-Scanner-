// BoxScan — AI Analysis Service (Gemini / Local Gateway / Mock) — sql.js version

import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDb } from '../db/index.js';
import type { DetectedItem, AnalysisProvider, AnalysisStatus, AnalysisMeta } from '../shared/types.js';
import { buildAnalysisPrompt, parseGeminiResponse } from './geminiPrompt.js';

export interface ImageUpload {
    buffer: Buffer;
    mimeType: string;
}

const AI_PROVIDER = (process.env.AI_PROVIDER || 'mock') as AnalysisProvider;

export interface AnalysisServiceResult {
    items: DetectedItem[];
    suggested_title: string;
    suggested_location: string;
    damage_flag: boolean;
    damage_notes: string | null;
    hazard_flag: boolean;
    hazard_notes: string | null;
    confidence?: string;
    analysisNotes?: string;
    summary: string;
    meta: AnalysisMeta;
}

/**
 * Analyze one or multiple images and return detected items.
 */
export async function analyzeImages(
    images: ImageUpload[],
    boxId?: string,
    imageId?: string
): Promise<AnalysisServiceResult> {
    const runId = uuidv4();
    const now = new Date().toISOString();
    let provider: AnalysisProvider = AI_PROVIDER;
    let rawResponse: string | null = null;
    let parsedJson: string | null = null;
    let status: AnalysisStatus = 'success';
    let errorMessage: string | null = null;
    let items: DetectedItem[] = [];
    let suggested_title = '';
    let suggested_location = '';
    let damage_flag = false;
    let damage_notes: string | null = null;
    let hazard_flag = false;
    let hazard_notes: string | null = null;
    let confidence: string | undefined = undefined;
    let analysisNotes: string | undefined = undefined;
    let summary = '';

    try {
        switch (provider) {
            case 'gemini': {
                const r = await analyzeWithGemini(images);
                items = r.items;
                rawResponse = r.rawResponse;
                suggested_title = r.suggested_title;
                suggested_location = r.suggested_location;
                damage_flag = r.damage_flag;
                damage_notes = r.damage_notes;
                hazard_flag = r.hazard_flag;
                hazard_notes = r.hazard_notes;
                confidence = r.confidence;
                analysisNotes = r.analysisNotes;
                summary = r.summary;
                break;
            }
            case 'local': {
                // To keep it simple, we use the first image for local gateway if array provided
                const r = await analyzeWithLocalGateway(images[0].buffer, images[0].mimeType);
                items = r.items;
                rawResponse = r.rawResponse;
                suggested_title = r.suggested_title;
                suggested_location = r.suggested_location;
                damage_flag = r.damage_flag;
                damage_notes = r.damage_notes;
                hazard_flag = r.hazard_flag;
                hazard_notes = r.hazard_notes;
                summary = r.summary;
                break;
            }
            case 'mock':
            default: {
                provider = 'mock';
                const r = getMockAnalysis();
                items = r.items;
                rawResponse = r.rawResponse;
                suggested_title = r.suggested_title;
                suggested_location = r.suggested_location;
                damage_flag = r.damage_flag;
                damage_notes = r.damage_notes;
                hazard_flag = r.hazard_flag;
                hazard_notes = r.hazard_notes;
                summary = r.summary;
                break;
            }
        }
        parsedJson = JSON.stringify({ items, suggested_title, suggested_location, damage_flag, damage_notes, hazard_flag, hazard_notes, confidence, analysisNotes, summary });
    } catch (err: any) {
        console.error('[AI] Analiz hatası:', err.message);
        console.error('[AI] Hata detayı:', JSON.stringify(err));
        status = err.message?.includes('parse') ? 'parse_error' : 'failed';
        errorMessage = err.message || 'Unknown error';
        items = [];
    }

    // Log analysis run
    try {
        const db = await getDb();
        db.run(
            `INSERT INTO analysis_runs (id, box_id, image_id, provider, raw_response, parsed_json, status, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [runId, boxId || null, imageId || null, provider, rawResponse, parsedJson, status, errorMessage, now]
        );
        saveDb();
    } catch (logErr) {
        console.error('[AI] Failed to log analysis run:', logErr);
    }

    return {
        items,
        suggested_title,
        suggested_location,
        damage_flag,
        damage_notes,
        hazard_flag,
        hazard_notes,
        confidence,
        analysisNotes,
        summary,
        meta: { provider, status, runId },
    };
}

interface ExtendedAnalysisResult {
    items: DetectedItem[];
    suggested_title: string;
    suggested_location: string;
    damage_flag: boolean;
    damage_notes: string | null;
    hazard_flag: boolean;
    hazard_notes: string | null;
    confidence?: string;
    analysisNotes?: string;
    summary: string;
    rawResponse: string;
}

// ─── Gemini Provider ────────────────────────────────
async function analyzeWithGemini(
    images: ImageUpload[]
): Promise<ExtendedAnalysisResult> {
    console.log(`[Gemini] analyzeWithGemini çağrıldı, ${images.length} fotoğraf yüklendi.`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[Gemini] GEMINI_API_KEY eksik!');
        throw new Error('GEMINI_API_KEY not configured');
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    try {
        console.log('[Gemini] API isteği başlıyor...');
        const promptParts = buildAnalysisPrompt(images.map(img => ({
            data: img.buffer.toString('base64'),
            mimeType: img.mimeType
        })));

        const result = await model.generateContent(promptParts);
        const text = result.response.text();
        console.log('[Gemini] Ham yanıt:', text.slice(0, 200));

        const parsed = parseGeminiResponse(text);

        return {
            items: parsed.items.map(i => ({
                name: i.name,
                quantity: i.quantity,
                category: 'uncategorized',
                condition: i.condition,
            })),
            suggested_title: parsed.suggestedLabel,
            suggested_location: parsed.suggestedShelf,
            damage_flag: parsed.hasDamagedItems,
            damage_notes: parsed.damageNotes || null,
            hazard_flag: parsed.hasDangerousItems,
            hazard_notes: parsed.dangerNotes || null,
            confidence: parsed.confidence,
            analysisNotes: parsed.analysisNotes || '',
            summary: parsed.analysisNotes || '',
            rawResponse: text,
        };
    } catch (geminiErr: any) {
        console.error('[Gemini] API hatası:', geminiErr.message);
        throw geminiErr;
    }
}

// ─── Local AI Gateway Provider ──────────────────────
async function analyzeWithLocalGateway(
    imageBuffer: Buffer,
    mimeType: string
): Promise<ExtendedAnalysisResult> {
    const gatewayUrl = process.env.AI_GATEWAY_URL;
    if (!gatewayUrl) throw new Error('AI_GATEWAY_URL not configured');

    const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image: imageBuffer.toString('base64'),
            mimeType,
            prompt: 'Analyze this box photo. Return JSON with items, suggested_title, suggested_location, damage_flag, damage_notes, hazard_flag, hazard_notes, summary.',
        }),
    });
    if (!response.ok) throw new Error(`AI Gateway returned ${response.status}`);

    const text = await response.text();
    return parseExtendedAIResponse(text);
}

// ─── Mock Provider ──────────────────────────────────
function getMockAnalysis(): ExtendedAnalysisResult {
    const items: DetectedItem[] = [
        { name: 'Tornavida', quantity: 3, category: 'Alet' },
        { name: 'Kablo', quantity: 5, category: 'Elektronik' },
    ];
    return {
        items,
        suggested_title: 'Elektrik Alet Kutusu',
        suggested_location: 'RAF A-1',
        damage_flag: false,
        damage_notes: null,
        hazard_flag: false,
        hazard_notes: null,
        summary: 'Elektrik işleri için alet ve kablo içeren kutu',
        rawResponse: JSON.stringify({ items, suggested_title: 'Elektrik Alet Kutusu', suggested_location: 'RAF A-1', damage_flag: false, damage_notes: null, hazard_flag: false, hazard_notes: null, summary: 'Elektrik işleri için alet ve kablo içeren kutu' }),
    };
}

// ─── Response Parser (Eski) ─────────────────────────
function parseExtendedAIResponse(text: string): ExtendedAnalysisResult {
    try {
        let jsonStr = text.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        const parsed = JSON.parse(jsonStr);
        if (!parsed.items || !Array.isArray(parsed.items)) {
            throw new Error('AI response missing items array');
        }
        const items: DetectedItem[] = parsed.items.map((item: any) => ({
            name: String(item.name || 'Unknown'),
            quantity: Number(item.quantity) || 1,
            category: String(item.category || 'uncategorized'),
        }));

        return {
            items,
            suggested_title: String(parsed.suggested_title ?? ''),
            suggested_location: String(parsed.suggested_location ?? ''),
            damage_flag: Boolean(parsed.damage_flag),
            damage_notes: parsed.damage_notes != null ? String(parsed.damage_notes) : null,
            hazard_flag: Boolean(parsed.hazard_flag),
            hazard_notes: parsed.hazard_notes != null ? String(parsed.hazard_notes) : null,
            summary: String(parsed.summary ?? ''),
            rawResponse: text,
        };
    } catch (err: any) {
        throw new Error(`Failed to parse AI response: ${err.message}`);
    }
}
