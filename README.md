# BoxScan

AI-powered box content management with QR code labels. Photograph a box, let Gemini identify what's inside, print a QR label, and scan it later to instantly retrieve the details.

---

## Features

- **AI Analysis** — Google Gemini 2.5 Flash detects objects, quantities, damage flags, and hazards from a photo
- **QR Labels** — Unique QR code generated per box; printable via Expo Print
- **Full CRUD** — Create, view, edit, archive, and delete boxes
- **Smart Search** — Semantic search across box names and contents
- **Photo Gallery** — Attach multiple photos per box with a fullscreen lightbox viewer
- **Dark / Light Theme** — System-aware with persistent preference
- **Audit Log** — Tracks created, updated, scanned, and deleted events per box

---

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Mobile   | React Native (Expo), Expo Router, Zustand       |
| Backend  | Node.js, Hono, TypeScript, better-sqlite3       |
| AI       | Google Gemini 2.5 Flash (`@google/genai`)       |
| Database | SQLite with FTS5 full-text search and WAL mode  |
| Deploy   | Docker, Docker Compose                          |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for server deployment)
- Google Gemini API key

### Backend

```bash
cd backend
cp .env.example .env
# Fill in GEMINI_API_KEY and API_SHARED_SECRET in .env
npm install
npm run dev
```

### Mobile

```bash
cd mobile
cp .env.example .env.local
# Set EXPO_PUBLIC_API_BASE_URL to your backend address
npm install
npx expo start
```

### Docker (production)

```bash
cp backend/.env.example backend/.env
# Fill in the required values
docker compose up -d --build
```

---

## Environment Variables

| Variable           | Description                              |
| ------------------ | ---------------------------------------- |
| `GEMINI_API_KEY`   | Google Gemini API key                    |
| `API_SHARED_SECRET`| Shared secret between mobile and backend |
| `APP_BASE_URL`     | Public URL of the backend server         |
| `AI_PROVIDER`      | `gemini` for real AI, `mock` for testing |

See `backend/.env.example` and `mobile/.env.example` for the full list.

---

## Project Structure

```
├── backend/          # Hono API server
│   ├── src/
│   │   ├── routes/   # boxes, scan, upload, analyze, qr
│   │   ├── services/ # AI, storage
│   │   └── db/       # SQLite schema and migrations
│   └── Dockerfile
├── mobile/           # Expo React Native app
│   ├── app/          # Expo Router screens
│   ├── components/   # Shared UI components
│   ├── store/        # Zustand state
│   └── hooks/        # Custom hooks (audio, AI)
├── shared/           # Shared TypeScript types
├── deploy/           # VM setup and migration scripts
└── docker-compose.yml
```

---

## License

MIT
