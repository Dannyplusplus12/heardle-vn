# Heardle VN

Vietnamese music guessing game — Heardle clone using Spotify API.

## Tech Stack
- Backend: FastAPI + SQLAlchemy (asyncpg) + PostgreSQL
- Frontend: React 18 + Vite + Tailwind CSS v4
- Audio: Spotify Web API (preview_url, 30s clips) + ffmpeg (clip cutting to 1/5/15/30s)
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
cp .env.example .env  # fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
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
| `SPOTIFY_CLIENT_ID` | backend | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | backend | From Spotify Developer Dashboard |
| `DATABASE_URL` | backend | postgresql+asyncpg://... (auto-set on Railway) |
| `FRONTEND_ORIGIN` | backend | CORS origin, e.g. http://localhost:5173 |
| `VITE_API_URL` | frontend | Backend URL, e.g. http://localhost:8000 |

## Spotify Credentials
1. Go to https://developer.spotify.com/dashboard
2. Create an app (any name/description, select "Web API")
3. Copy Client ID and Client Secret into your `.env`
4. Credentials are permanent — no rotation needed
