# Heardle VN

Vietnamese music guessing game — Heardle clone using Spotify API.

## Tech Stack
- Backend: FastAPI + SQLAlchemy (asyncpg) + PostgreSQL
- Frontend: React 19 + Vite + Tailwind CSS v4 + React Router v7
- Audio: Deezer → SoundCloud → YouTube pipeline + ffmpeg (clip cutting to 1/5/15/30s)
- Auth: Google OAuth + JWT (python-jose, @react-oauth/google)
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
cp .env.example .env  # fill SPOTIFY_*, JWT_SECRET, GOOGLE_CLIENT_ID, ADMIN_EMAILS
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # set VITE_API_URL, VITE_GOOGLE_CLIENT_ID
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
| `JWT_SECRET` | backend | Secret for signing JWT tokens |
| `GOOGLE_CLIENT_ID` | backend | From Google Cloud Console OAuth 2.0 |
| `ADMIN_EMAILS` | backend | Comma-separated admin emails, e.g. huyh13530@gmail.com |
| `VITE_API_URL` | frontend | Backend URL, e.g. http://localhost:8000 |
| `VITE_GOOGLE_CLIENT_ID` | frontend | Same as GOOGLE_CLIENT_ID (for OAuth button) |

## Routes

| Path | Page |
|---|---|
| `/ngau-nhien` | Random mode (genre picker → game) |
| `/fan-cung` | Fan mode (artist/playlist picker → game) |
| `/doi-dau` | Head-to-head (coming soon) |

## Game Flow — Fan Cứng Mode
1. User picks artists and/or playlists (multi-select)
2. Click play → `GET /api/game/new?artist_ids=1,2&playlist_ids=3`
3. Backend picks random track from union of those sources (DB only)
4. GuessInput → `GET /api/search?q=...&artist_ids=1,2&playlist_ids=3` (pool-aware)
5. Audio clip → same multi-source pipeline: Deezer → SoundCloud → YouTube

## Admin Flow — Adding Artists
1. Admin (logged in via Google) clicks "+ Nghệ sĩ"
2. Fills name, avatar URL, description, genre, optional SC/YT URLs
3. Backend creates Artist record, starts background crawl:
   - Deezer: 0 tracks → flag `needs_manual_url=True`; 1–5 tracks → low activity skip; 6+ → save tracks
   - SoundCloud/YouTube URLs → crawl via yt-dlp if provided
4. "⚠ URL" button shows artists flagged as needing manual URL input

## UI Style — Neo-Brutalism (dark)
Fan Cứng page and admin modals use Neo-Brutalism on a dark background:
- **Background**: `#0A0A0A` / `#0f0f0f` / `#111`
- **Primary accent**: amber-400 (`#F59E0B`)
- **Borders**: `border-2` with `border-white/15` for cards, `border-amber-400` for selected
- **Hard shadows**: `shadow-[4px_4px_0_#F59E0B]` selected, `shadow-[4px_4px_0_#fff]` button hover
- **No border-radius** on cards/buttons (`rounded-none` is default)
- **Typography**: font-black, uppercase, tracking-widest for all labels/headers
- **Hover state**: `-translate-x-[2px] -translate-y-[2px]` + hard shadow shift
- **Selection chips**: `border-2 border-amber-400/50 bg-amber-400/10 text-amber-300`
- Keep this style consistent across all Fan Cứng UI and admin panels

## Key API Endpoints

| Endpoint | Notes |
|---|---|
| `GET /api/game/new` | `genre`, `artists` (legacy names), `artist_ids` (DB IDs), `playlist_ids` |
| `GET /api/search` | `q`, `artist_ids` (pool-aware), `playlist_ids`, `artists` (legacy) |
| `GET /api/artists` | Public list with search/pagination |
| `GET /api/playlists` | Public playlist list |
| `POST /api/auth/google` | Exchange Google ID token for JWT |
| `GET /api/auth/me` | Current user from JWT |
| `POST /api/admin/artists` | Create + auto-crawl (admin only) |
| `PUT /api/admin/artists/{id}` | Edit + re-crawl if URL changed (admin only) |
| `POST /api/admin/artists/{id}/crawl` | Manual re-crawl trigger |
| `POST /api/admin/playlists` | Create playlist (admin only) |
| `POST /api/admin/playlists/{id}/tracks` | Add track to playlist |
