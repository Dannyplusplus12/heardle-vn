# Heardle VN

Vietnamese music guessing game — Heardle clone using SoundCloud API.

## Tech Stack
- Backend: FastAPI + SQLAlchemy (asyncpg) + PostgreSQL
- Frontend: React 18 + Vite + Tailwind CSS v4
- Audio: SoundCloud API v2 + ffmpeg (clip cutting)
- Deploy: Railway + Docker

## Local Dev

### Prerequisites
- Python 3.11+
- Node 20+
- ffmpeg installed (`winget install ffmpeg` on Windows)
- Docker Desktop (for full stack via docker-compose)

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # fill in SOUNDCLOUD_CLIENT_ID
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # set VITE_API_URL if needed
npm run dev
```

### Full stack (Docker)
```bash
docker-compose up --build
```

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `SOUNDCLOUD_CLIENT_ID` | backend | From SoundCloud web app DevTools (see notes) |
| `DATABASE_URL` | backend | postgresql+asyncpg://... (auto-set on Railway) |
| `FRONTEND_ORIGIN` | backend | CORS origin, e.g. http://localhost:5173 |
| `VITE_API_URL` | frontend | Backend URL, e.g. http://localhost:8000 |

## SoundCloud client_id Note
The client_id rotates every few weeks. To get a fresh one:
1. Open soundcloud.com in Chrome
2. DevTools → Network → filter `api-v2.soundcloud.com`
3. Copy the `client_id` query param from any request
