// BoxScan — Shared Types
// Used by both backend and mobile app

// ─── Box ────────────────────────────────────────────
export interface Box {
  id: string;
  title: string | null;
  qr_code: string;
  location: string | null;
  notes: string | null;
  status: BoxStatus;
  source: string;
  created_by: string | null;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BoxStatus = 'active' | 'archived' | 'deleted';

export interface BoxWithDetails extends Box {
  images: BoxImage[];
  items: BoxItem[];
  item_count: number;
}

// ─── Box Image ──────────────────────────────────────
export interface BoxImage {
  id: string;
  box_id: string;
  image_url: string;
  is_primary: boolean;
}

// ─── Box Item ───────────────────────────────────────
export interface BoxItem {
  id: string;
  box_id: string;
  name: string;
  normalized_name: string | null;
  quantity: number;
  category: string;
}

// ─── Analysis ───────────────────────────────────────
export type AnalysisProvider = 'gemini' | 'local' | 'mock';
export type AnalysisStatus = 'success' | 'parse_error' | 'failed';

export interface AnalysisRun {
  id: string;
  box_id: string | null;
  image_id: string | null;
  provider: AnalysisProvider;
  raw_response: string | null;
  parsed_json: string | null;
  status: AnalysisStatus;
  error_message: string | null;
  created_at: string;
}

export interface DetectedItem {
  name: string;
  quantity: number;
  category: string;
}

export interface AnalysisResult {
  items: DetectedItem[];
}

export interface AnalysisMeta {
  provider: AnalysisProvider;
  status: AnalysisStatus;
  runId: string;
}

// ─── Box Events ─────────────────────────────────────
export type BoxEventType = 'created' | 'updated' | 'scanned' | 'deleted';

export interface BoxEvent {
  id: string;
  box_id: string;
  event_type: BoxEventType;
  payload: string | null;
  created_at: string;
}

// ─── QR Payload ─────────────────────────────────────
export interface QRPayload {
  v: 1;
  id: string;       // boxId
  t: 'box';         // type
  n: string;        // name (max 30 chars)
  i: string[];      // items (max 5, each max 20 chars)
}

// ─── API Responses ──────────────────────────────────
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Request Payloads ───────────────────────────────
export interface CreateBoxPayload {
  title?: string | null;
  location?: string | null;
  notes?: string | null;
  source?: string;
  items: DetectedItem[];
  imageUrls: string[];
  primaryImageIndex?: number;
}

export interface UpdateBoxPayload {
  title?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: BoxStatus;
}

export interface ScanPayload {
  boxId: string;
}

// ─── Query Params ───────────────────────────────────
export interface BoxListQuery {
  search?: string;
  category?: string;
  location?: string;
  status?: BoxStatus;
  limit?: number;
  offset?: number;
  sort?: 'created_at' | 'updated_at' | 'last_scanned_at' | 'title';
  order?: 'asc' | 'desc';
}

// ─── Analyze Response ───────────────────────────────
export interface AnalyzeResponse {
  imageUrl: string;
  items: DetectedItem[];
  analysisMeta: AnalysisMeta;
}

// ─── QR Response ────────────────────────────────────
export interface QRResponse {
  qrCodeDataUrl: string;
  payload: QRPayload;
}
