# BoxScan — Smart Box Management System

QR code and AI-powered warehouse/storage content management. Photograph a box, let Gemini identify what's inside, generate a QR label, scan it later, and instantly retrieve the full contents.

**Status:** V1 MVP — Stable and fully functional for core usage scenarios.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Installation](#installation)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [Usage Workflows](#usage-workflows)
- [Theme System](#theme-system)
- [Security](#security)
- [Known Limitations](#known-limitations)

---

## Overview

BoxScan is a full-stack mobile system that builds a searchable content inventory for physical boxes using AI, then provides instant access via printed QR labels. The user photographs a box; Google Gemini 2.5 Flash analyzes the photo, lists detected objects (with quantities and confidence levels), flags damage or hazardous materials, and suggests a name and storage location. After reviewing and approving the AI result, the box is saved to a SQLite database, a unique QR label is generated, and it can be printed for the field. Anyone scanning the label with the app instantly sees the box's full content details.

---

## Features

### AI Analysis
- Photo-based content detection via **Google Gemini 2.5 Flash**
- Object names and category labels
- Quantity estimation per object with confidence level (`high` / `medium` / `low`)
- Automatic damage detection (`damage_flag`) with description
- Hazardous material detection (`hazard_flag`): chemicals, sharp items, flammables
- Suggested box name and storage location

### QR Code Ecosystem
- Unique, compact JSON payload per box (`v`, `id`, `t`, `n`, `i` fields)
- QR code generation as Data URL
- Expo Print integration for label printing
- QR scan → instant redirect to box detail screen

### Box Lifecycle
- Full CRUD: Create / View / Edit / Delete
- Status tracking: `active` | `archived` | `deleted`
- Last-scanned timestamp updated on every QR scan
- Location, notes, source metadata
- Full audit log: `created` | `updated` | `scanned` | `deleted`

### Photo Gallery & Lightbox
- Attach multiple photos per box
- Primary photo badge marker
- Tap any photo to open a **fullscreen lightbox modal**
- Swipe left/right to navigate between photos
- Tap or back-button to dismiss

### Smart Search
- Semantic search powered by Gemini
- Multi-field search across box names and item contents
- FTS5 full-text search fallback for offline/fast queries
- Match reasoning and relevance score in results

### Theme System
- Light / Dark theme adapting to system preference
- Rifle-animated theme toggle button with glow pulse
- Persistent theme preference via AsyncStorage

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│               MOBILE APP (React Native)                │
│   Expo Router · Reanimated · Zustand · Lucide Icons   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP + X-API-Key
                ┌──────────▼──────────┐
                │   BACKEND (Hono)    │
                │  Node.js · TypeScript│
                └──────┬──────┬───────┘
                       │      │
          ┌────────────▼──┐  ┌▼──────────────┐
          │  SQLite DB    │  │  Google Gemini │
          │better-sqlite3 │  │  2.5 Flash API │
          │  FTS5 + WAL   │  └───────────────┘
          └───────────────┘
                  │
          ┌───────▼────────┐
          │  Local Storage  │
          │  (uploads/)     │
          └────────────────┘
```

### Data Flow — Adding a New Box

```
Take Photo → POST /api/analyze → Gemini Analysis
→ Review Contents → Approve → POST /api/boxes
→ Generate QR → Print Label → Attach to Box
```

### Data Flow — QR Scanning

```
Scan QR → Parse JSON payload → POST /api/scan
→ Update last_scanned_at → Audit log entry
→ GET /api/boxes/:id → Box Detail Screen
```

---

## Technology Stack

### Mobile (React Native)

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81.5 | Mobile application framework |
| React | 19.1.0 | UI layer |
| Expo | ~54.0.0 | Managed build, native modules |
| Expo Router | ~6.0.23 | File-based routing |
| React Navigation Drawer | ^7.9.4 | Sidebar navigation |
| React Native Reanimated | ~4.1.1 | Spring physics animations (60fps) |
| React Native Gesture Handler | ~2.28.0 | Touch and gesture recognition |
| Zustand | ^5.0.12 | Lightweight global state management |
| AsyncStorage | 2.2.0 | Persistent storage |
| Expo Camera | ~17.0.10 | Camera access and QR scanning |
| Expo AV | ~16.0.8 | Audio feedback |
| Expo Haptics | ~15.0.8 | Haptic feedback |
| Expo Print | ~15.0.8 | QR label printing |
| Expo Secure Store | ~15.0.8 | Encrypted local storage |
| Expo Linear Gradient | ~15.0.8 | Gradient backgrounds |
| React Native SVG | 15.12.1 | SVG rendering |
| Lucide React Native | ^0.577.0 | Icon library |
| TypeScript | ~5.9.2 | Type safety (strict mode) |

### Backend (Node.js)

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime environment |
| Hono | ^4.6.0 | HTTP framework (routing, middleware, CORS) |
| @hono/node-server | ^1.13.0 | Hono → Node.js HTTP adapter |
| @google/generative-ai | ^0.21.0 | Gemini API client |
| better-sqlite3 | ^12.8.0 | Native SQLite engine (WAL + FTS5) |
| qrcode | ^1.5.4 | QR code generation as Data URL |
| uuid | ^11.0.0 | UUID v4 generation |
| Zod | ^3.24.0 | Schema validation and type inference |
| tsx | ^4.19.0 | Run TypeScript without a build step |
| TypeScript | ^5.7.0 | Type safety (strict mode) |

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts          # DB connection and query helpers
│   │   │   └── migrate.ts        # Auto-run migrations (FTS5, WAL, triggers)
│   │   ├── lib/
│   │   │   ├── errors.ts         # Global error handling
│   │   │   └── magicBytes.ts     # File signature validation
│   │   ├── middleware/
│   │   │   ├── auth.ts           # X-API-Key authentication
│   │   │   └── rateLimit.ts      # Rate limiting
│   │   ├── routes/
│   │   │   ├── boxes.ts          # CRUD + FTS5 search
│   │   │   ├── analyze.ts        # Image upload → AI analysis
│   │   │   ├── scan.ts           # QR scan logging
│   │   │   ├── qr.ts             # QR payload generation
│   │   │   └── upload.ts         # Image-only upload
│   │   ├── services/
│   │   │   ├── ai.ts             # AI provider routing (Gemini / Mock)
│   │   │   └── storage.ts        # File storage management
│   │   ├── config.ts             # Type-safe environment config
│   │   └── index.ts              # Server entry point
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── mobile/
│   ├── app/                      # Expo Router screens
│   │   ├── _layout.tsx           # Root layout + Drawer menu
│   │   ├── index.tsx             # Home / Dashboard
│   │   ├── camera.tsx            # Camera capture screen
│   │   ├── scan.tsx              # QR scanner screen
│   │   ├── review.tsx            # AI result review screen
│   │   ├── label.tsx             # QR label / print screen
│   │   ├── boxes.tsx             # All boxes list
│   │   ├── settings.tsx          # Settings screen
│   │   └── box/[id].tsx          # Box detail + photo lightbox
│   ├── components/
│   │   ├── ThemeToggle/          # Animated rifle theme toggle
│   │   ├── DataRain.tsx          # Matrix-style visual (conditional mount)
│   │   └── ...
│   ├── constants/
│   │   ├── theme.ts              # Design system tokens
│   │   └── config.ts             # App config + timeout values
│   ├── services/
│   │   └── api.ts                # API client (fetch + multipart upload)
│   ├── store/
│   │   └── useScanStore.ts       # Zustand store (scan state)
│   └── hooks/
│       └── useAIAudio.ts         # Audio feedback during scanning
│
├── shared/
│   └── types.ts                  # Shared TypeScript types
│
├── deploy/
│   ├── vm-setup.sh               # Install Docker on a fresh VM (Ubuntu/Debian)
│   └── migrate-to-vm.sh          # Rsync project + DB to remote VM
│
└── docker-compose.yml
```

---

## Database Schema

### `boxes`
| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `title` | TEXT | Box name |
| `qr_code` | TEXT | Stringified QR payload JSON |
| `location` | TEXT | Storage location |
| `notes` | TEXT | Free-form notes |
| `status` | TEXT | `active` \| `archived` \| `deleted` |
| `source` | TEXT | Content source (default: `mixed`) |
| `created_by` | TEXT | Creator device/user |
| `last_scanned_at` | TEXT | ISO 8601 timestamp of last QR scan |
| `damage_flag` | INTEGER | Damage detected (0/1) |
| `damage_notes` | TEXT | Damage description |
| `hazard_flag` | INTEGER | Hazardous material present (0/1) |
| `hazard_notes` | TEXT | Hazard description |
| `summary` | TEXT | AI-generated summary |
| `created_at` | TEXT | ISO 8601 creation time |
| `updated_at` | TEXT | ISO 8601 last update time |

### `box_images`
| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `box_id` | TEXT FK | → `boxes.id` (CASCADE DELETE) |
| `image_url` | TEXT | File path or URL |
| `is_primary` | INTEGER | Cover photo flag (0/1) |

### `box_items`
| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `box_id` | TEXT FK | → `boxes.id` (CASCADE DELETE) |
| `name` | TEXT | Object name |
| `normalized_name` | TEXT | Normalized for search |
| `quantity` | INTEGER | Quantity (default: 1) |
| `category` | TEXT | Category (default: `uncategorized`) |

### `analysis_runs`
| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `box_id` | TEXT FK | → `boxes.id` (SET NULL on delete) |
| `image_id` | TEXT FK | → `box_images.id` (SET NULL on delete) |
| `provider` | TEXT | `gemini` \| `local` \| `mock` |
| `raw_response` | TEXT | Model raw output |
| `parsed_json` | TEXT | Parsed AI result |
| `status` | TEXT | `success` \| `parse_error` \| `failed` |
| `error_message` | TEXT | Error details |
| `created_at` | TEXT | ISO 8601 analysis time |

### `box_events` — Audit Log
| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `box_id` | TEXT FK | → `boxes.id` (CASCADE DELETE) |
| `event_type` | TEXT | `created` \| `updated` \| `scanned` \| `deleted` |
| `payload` | TEXT | Event metadata (JSON) |
| `created_at` | TEXT | ISO 8601 event time |

> **FTS5 virtual table** (`boxes_fts`) mirrors `title`, `summary`, `location`, and all `box_items.name` values for fast full-text search. WAL mode is enabled for concurrent reads.

---

## API Reference

All endpoints require the `X-API-Key` header.

### Boxes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/boxes` | List boxes (search, filter by status, sort, pagination) |
| `GET` | `/api/boxes/:id` | Box detail with images and items |
| `GET` | `/api/boxes/search/smart` | Gemini semantic search + FTS5 fallback |
| `POST` | `/api/boxes` | Create new box (transactional) |
| `PUT` | `/api/boxes/:id` | Update box metadata |
| `DELETE` | `/api/boxes/:id` | Soft-delete box |

### Image & Analysis

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Multipart upload → Gemini analysis → returns result |
| `POST` | `/api/upload` | Image upload only (no analysis) |

### QR & Scanning

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/qr/:boxId` | Generate QR code as Data URL |
| `POST` | `/api/scan` | Register QR scan, update `last_scanned_at` |

### Response Format

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "...", "code": "NOT_FOUND" }
```

---

## Installation

### Prerequisites

- Node.js 20+
- npm 10+
- Google Gemini API key ([Google AI Studio](https://aistudio.google.com))
- Android/iOS device or emulator with Expo Go

### 1. Clone and install

```bash
git clone <repo-url>
cd BoxScan
npm install
```

### 2. Configure backend

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set GEMINI_API_KEY and API_SHARED_SECRET
```

### 3. Start backend

```bash
cd backend
npm run dev
# Server starts at http://localhost:3000
# Database migrations run automatically on first start
```

### 4. Configure mobile

```bash
cp mobile/.env.example mobile/.env.local
# Set EXPO_PUBLIC_API_BASE_URL=http://<your-local-ip>:3000
# Set EXPO_PUBLIC_API_KEY to match backend API_SHARED_SECRET
```

### 5. Start mobile app

```bash
cd mobile
npx expo start
# Scan QR with Expo Go or press 'a' for Android emulator
```

---

## Docker Deployment

### Quick start (local or VM)

```bash
cp backend/.env.example backend/.env
# Fill in GEMINI_API_KEY, API_SHARED_SECRET, APP_BASE_URL

docker compose up -d --build
# Backend available at http://<host>:3000
```

The database file and uploaded images are volume-mounted outside the container so they persist across restarts and rebuilds.

### VM deployment

A pair of scripts in `deploy/` automate setting up a fresh Ubuntu/Debian VM:

```bash
# On the VM (once):
bash deploy/vm-setup.sh

# From your machine — rsyncs source + database + uploads to the VM:
./deploy/migrate-to-vm.sh <VM_IP> [ssh-user]
```

After migration, SSH into the VM and run `docker compose up -d --build`.

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=3000
APP_BASE_URL=http://192.168.1.x:3000

# Storage
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads

# AI
AI_PROVIDER=gemini              # gemini | mock
GEMINI_API_KEY=AIzaSy...        # From Google AI Studio
AI_GATEWAY_URL=                 # Optional local gateway

# Security
API_SHARED_SECRET=<openssl rand -hex 32>
MAX_UPLOAD_MB=10

# CORS
CORS_ORIGINS=http://localhost:8081,exp://192.168.1.x:8081
```

### Mobile (`mobile/.env.local`)

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000
EXPO_PUBLIC_API_KEY=<same as API_SHARED_SECRET>
```

> **Timeouts:** Normal API requests time out after **60 s**. Long-running AI/upload operations use a separate **120 s** timeout (`AI_REQUEST_TIMEOUT`).

---

## Usage Workflows

### Saving a New Box

1. Tap **New Box** on the home screen
2. Camera opens — photograph the box contents
3. AI analysis runs (2–4 seconds)
4. Review detected items, damage/hazard flags, and suggested name
5. Edit if needed, tap **Confirm**
6. Box is saved, QR code is generated
7. Tap **Print Label** to print and attach to the box

### QR Scanning

1. Tap **Scan** on the home screen
2. Point camera at the QR label
3. App resolves the box and opens the detail screen instantly

### Viewing Photos

On the box detail screen, tap any thumbnail to open the fullscreen lightbox. Swipe left/right to browse all photos attached to that box.

### Smart Search

1. Type in the search bar on the home screen
2. With Gemini toggle active: semantic search runs against item names and summaries
3. FTS5 full-text search provides a fast offline fallback

---

## Theme System

The UI is built on a military/industrial aesthetic:

| Element | Detail |
|---|---|
| Primary color | Laser red `#E63946` |
| Background | Dark navy `#0B0E1A` |
| Headings | Barlow Condensed |
| Data/code | DM Mono |
| Body | Inter |
| Spacing | 4pt grid |
| Animation engine | React Native Reanimated v4 (spring physics) |
| Theme toggle | Rifle mechanism animation + glow pulse |
| Persistence | AsyncStorage |

---

## Security

| Layer | Mechanism |
|---|---|
| Authentication | `X-API-Key` header, shared secret |
| Rate limiting | Per-minute request cap (middleware) |
| CORS | Configurable origin allowlist |
| Input validation | Zod schemas on all routes |
| File validation | Magic byte check + path traversal protection |
| Secure headers | Hono `secureHeaders` middleware |
| Mobile storage | Expo Secure Store (encrypted) |

---

## Known Limitations

| Area | Current State | Migration Path |
|---|---|---|
| Database | SQLite (single server) | PostgreSQL |
| Image storage | Local filesystem | AWS S3 / Cloudflare R2 |
| Authentication | Shared API key | JWT + user roles (RBAC) |
| AI analysis speed | 2–4 s per photo | Image compression, request batching |
| Offline mode | Requires backend connection | Expo SQLite + offline sync queue |
| Logging | Event table + console | Structured logging (Pino) |

---

## License

MIT
