# Box Scanner

> AI-powered warehouse inventory management — photograph a box, let Gemini identify the contents, generate a QR label, and retrieve everything instantly with a scan.

![Status](https://img.shields.io/badge/status-V1%20MVP-blue) ![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Overview

Box Scanner is a full-stack mobile system that eliminates manual inventory entry in warehouses and storage facilities. A worker photographs a box; Google Gemini 2.5 Flash analyses the image in Turkish, lists every visible item with quantities, detects damage and hazardous materials, and suggests a storage location. Once confirmed, the box is saved to the database, a compact QR label is generated and printed, and any future scan of that label instantly surfaces the full inventory record.

**Built as an internal tool for a defense and aviation technology company in Turkey.**

---

## Demo Flow

```
📷 Take photo  →  🤖 Gemini analysis  →  ✏️ Review & edit
→  💾 Save to DB  →  🏷️ Print QR label  →  📲 Scan → instant detail
```

---

## Features

### AI Analysis
- **Google Gemini 2.5 Flash** — photo-based content detection
- Turkish item names, categories, and quantity estimates
- Confidence level per analysis (`high` / `medium` / `low`)
- Automatic **damage detection** with description
- **Hazardous material detection**: chemicals, sharp objects, flammables
- Suggested box title and storage location

### QR Ecosystem
- Unique compact JSON payload per box (`v`, `id`, `t`, `n`, `i`)
- QR code generated as data URL
- Label printing via Expo Print
- Scan → instant box detail screen

### Box Lifecycle
- Full CRUD — create, view, edit, delete
- Status tracking: `active` | `archived` | `deleted`
- Last-scanned timestamp
- Location, notes, source metadata
- Audit log: `created` | `updated` | `scanned` | `deleted`

### Smart Search
- Gemini-powered semantic search
- Multi-field matching across box titles and item lists
- Fallback string matching when AI is unavailable
- Match reasoning and relevance score

### UI / UX
- Military-industrial dark aesthetic (Lasersan Factory V5 design system)
- Animated scan line, crosshair overlay, ripple processing rings
- Shutter curtain + haptic feedback on photo capture
- Lock-on corner animation on AI confirmation
- AI audio feedback (activate / scan / complete sounds)
- Light / dark theme with animated rifle-toggle button

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│               MOBILE APP (React Native)                │
│   Expo Router · Reanimated · Zustand · Lucide Icons   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP + API Key
                ┌──────────▼──────────┐
                │   BACKEND (Hono)    │
                │  Node.js · TypeScript│
                └──────┬──────┬───────┘
                       │      │
          ┌────────────▼──┐  ┌▼──────────────┐
          │  SQLite DB    │  │  Google Gemini │
          │  (sql.js)     │  │  2.5 Flash API │
          └───────────────┘  └───────────────┘
                  │
          ┌───────▼────────┐
          │  Local Storage  │
          │  (uploads/)     │
          └────────────────┘
```

---

## Tech Stack

### Mobile

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Mobile framework |
| Expo | ~54.0.0 | Managed build + native modules |
| Expo Router | ~6.0.23 | File-based navigation |
| React Native Reanimated | ~4.1.1 | 60fps spring physics animations |
| Zustand | ^5.0.12 | Lightweight global state |
| AsyncStorage | 2.2.0 | Persistent Zustand storage |
| Expo Camera | ~17.0.10 | Camera access + QR scanning |
| Expo AV | ~16.0.8 | Audio feedback |
| Expo Haptics | ~15.0.8 | Vibration feedback |
| Expo Print | ~15.0.8 | QR label printing |
| React Native SVG | 15.12.1 | SVG rendering |
| Lucide React Native | ^0.577.0 | Icon library |
| TypeScript | ~5.9.2 | Strict type safety |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Hono | ^4.6.0 | HTTP framework |
| sql.js | ^1.11.0 | SQLite engine (JavaScript) |
| @google/generative-ai | ^0.21.0 | Gemini API client |
| qrcode | ^1.5.4 | QR code generation |
| Zod | ^3.24.0 | Schema validation |
| uuid | ^11.0.0 | UUID v4 generation |
| TypeScript | ^5.7.0 | Strict type safety |

---

## Project Structure

```
BoxScanner/
├── backend/
│   └── src/
│       ├── db/          # SQLite connection, migrations, schema
│       ├── middleware/  # API key auth, rate limiting
│       ├── routes/      # boxes, analyze, scan, qr, upload
│       ├── services/    # AI provider, Gemini prompt, QR, storage
│       └── shared/      # Zod schemas, TypeScript types
│
├── mobile/
│   ├── app/             # Expo Router screens
│   │   ├── index.tsx    # Dashboard
│   │   ├── camera.tsx   # Photo capture + AI analysis
│   │   ├── scan.tsx     # QR scanner
│   │   ├── review.tsx   # AI result review & edit
│   │   ├── label.tsx    # QR label + print
│   │   ├── boxes.tsx    # All boxes list
│   │   └── box/[id].tsx # Box detail
│   ├── components/      # Reusable UI components
│   ├── constants/       # Theme, colors, config
│   ├── store/           # Zustand scan result store
│   ├── hooks/           # useAIAudio
│   └── services/        # API client
│
└── shared/              # Cross-package types and schemas
```

---

## Database Schema

### `boxes`
| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID v4 |
| `title` | text | Box label |
| `qr_code` | text | Stringified QR payload |
| `location` | text | Storage location |
| `status` | text | `active` \| `archived` \| `deleted` |
| `damage_flag` | boolean | Damage detected |
| `hazard_flag` | boolean | Hazardous material present |
| `summary` | text | AI-generated summary |

### `box_items`
| Column | Type | Description |
|--------|------|-------------|
| `id` | text PK | UUID v4 |
| `box_id` | text FK | → boxes.id |
| `name` | text | Item name |
| `quantity` | integer | Count |
| `category` | text | Category tag |

### `box_events` — Audit Log
| Column | Type | Description |
|--------|------|-------------|
| `event_type` | text | `created` \| `updated` \| `scanned` \| `deleted` |
| `payload` | text | Event metadata (JSON) |

---

## API Reference

All endpoints require `X-API-Key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/boxes` | List with search, filter, sort, pagination |
| `GET` | `/api/boxes/:id` | Detail with images and items |
| `GET` | `/api/boxes/search/smart` | Gemini semantic search |
| `POST` | `/api/boxes` | Create new box (transaction) |
| `PUT` | `/api/boxes/:id` | Update metadata |
| `DELETE` | `/api/boxes/:id` | Delete with cascade |
| `POST` | `/api/analyze` | Upload image → AI analysis |
| `POST` | `/api/upload` | Upload image only |
| `GET` | `/api/qr/:boxId` | Generate QR as data URL |
| `POST` | `/api/scan` | Record QR scan event |

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "...", "code": "NOT_FOUND" }
```

---

## Getting Started

### Requirements

- Node.js 20+
- Google Gemini API key — [Google AI Studio](https://aistudio.google.com)
- Android/iOS device or emulator
- Expo Go app (for physical device testing)

### 1. Clone

```bash
git clone https://github.com/oktaykesan/Box-Scanner.git
cd Box-Scanner
npm install
```

### 2. Backend Environment

```bash
cp backend/.env.example backend/.env
```

```env
PORT=3000
APP_BASE_URL=http://192.168.1.x:3000
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
API_SHARED_SECRET=your_secret_here
CORS_ORIGINS=http://localhost:8081,exp://192.168.1.x:8081
```

### 3. Start Backend

```bash
cd backend
npm run dev
# Server starts at http://localhost:3000
# DB migration runs automatically
```

### 4. Mobile Environment

```bash
cp mobile/.env.local.example mobile/.env.local
```

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000
EXPO_PUBLIC_API_KEY=your_secret_here
```

### 5. Start Mobile

```bash
cd mobile
npm start
```

---

## Security

| Layer | Method |
|-------|--------|
| Authentication | `X-API-Key` shared secret |
| Rate limiting | Per-minute request cap middleware |
| CORS | Configurable origin allowlist |
| Input validation | Zod schemas on all routes |
| File safety | Path traversal protection |
| Secure headers | Hono `secureHeaders` middleware |
| Mobile storage | Expo Secure Store (encrypted) |

---

## Known Limitations & Roadmap

| Area | Current | Planned |
|------|---------|---------|
| Database | SQLite (single server) | PostgreSQL |
| Image storage | Local filesystem | AWS S3 / Cloudflare R2 |
| Authentication | Shared API key | JWT + RBAC |
| Offline mode | Requires backend | Expo SQLite + sync |
| Logging | Event table + console | Structured logging (Pino) |

---

## Design System

| Element | Value |
|---------|-------|
| Primary color | Laser red `#E63946` |
| Background | Dark navy `#0B0E1A` |
| Heading font | Barlow Condensed |
| Data font | DM Mono |
| Body font | Inter |
| Spacing | 4pt grid |
| Animation | Spring physics (Reanimated v4) |

---

## Author

**Oktay** — IT Support Specialist & Mobile Developer  
Built and deployed as an internal inventory tool for a defense and aviation technology company in Turkey.

---

## License

MIT
