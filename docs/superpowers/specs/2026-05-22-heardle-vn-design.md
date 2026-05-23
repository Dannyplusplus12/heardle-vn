# Heardle VN — Design Spec

**Date:** 2026-05-22  
**Status:** Approved

## Overview

A Vietnamese music guessing game (Heardle clone). Players listen to progressively longer audio clips of a random Vietnamese song from SoundCloud and try to guess the title. UI is entirely in Vietnamese. No login required — playable as guest.

## Game Flow

1. App loads → backend fetches a random Vietnamese track from SoundCloud
2. Player hears a **1-second** clip
3. Player either:
   - Types a guess in the autocomplete search box and submits
   - Clicks **Bỏ qua** (Skip) to reveal the next clip
4. Steps repeat for **5s → 15s → 30s** clips
5. At the 30s stage, an additional **Bỏ cuộc** (Give up) button appears
6. Game ends on: correct guess | 4 failed/skipped attempts | give up
7. Answer is revealed → player clicks **Chơi lại** to start a new random song

## Architecture

```
[React + Vite SPA]  ──HTTP/REST──  [FastAPI Backend]  ──  [SoundCloud API v2]
                                          |
                                    [ffmpeg] (audio clip)
                                          |
                                    [PostgreSQL]  (set up, unused in MVP)
```

- All game state lives in the browser (React state)
- Backend is stateless per request
- PostgreSQL is configured and connected but not queried in MVP — reserved for future features (leaderboards, caching, game modes)

## Backend API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/game/new` | Fetch random Vietnamese track. Returns `track_id`, `title`, `artist`, `cover_url` |
| `GET` | `/api/game/clip/{track_id}?duration=1` | Stream first N seconds of audio (1/5/15/30) via ffmpeg |
| `GET` | `/api/search?q=...` | SoundCloud search for autocomplete. Returns `[{id, title, artist}]` |
| `GET` | `/api/health` | Health check for Railway |

**Audio clipping:** Backend resolves the SoundCloud progressive MP3 stream URL, pipes it through `ffmpeg -t {duration}`, and streams `audio/mpeg` directly to browser. No temp files.

## Frontend Components

- `GamePage` — root component, holds all game state
- `CoverArt` — blurred until game ends
- `ClipStageBar` — shows current stage: 1s / 5s / 15s / 30s
- `AudioPlayer` — play button + progress bar for current clip
- `GuessInput` — autocomplete search (calls `/api/search`)
- `ActionBar` — Skip + Give Up buttons
- `ResultBanner` — win/lose message + song info revealed
- `NewGameButton` — "Chơi lại" → calls `/api/game/new`

## Project Structure

```
DoanNhac/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── models.py       (SQLAlchemy models, unused in MVP)
│   │   ├── database.py     (PostgreSQL connection)
│   │   └── soundcloud.py   (SoundCloud API client)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── railway.toml
├── CLAUDE.md
└── README.md
```

## Deployment

- **GitHub:** project pushed to GitHub repo, Railway watches the `main` branch
- **Railway:** two services (backend + frontend) + PostgreSQL plugin
- **Docker:** each service has its own Dockerfile; `docker-compose.yml` for local dev
- **Environment variables on Railway:**
  - `SOUNDCLOUD_CLIENT_ID`
  - `DATABASE_URL` (auto-injected by Railway PostgreSQL plugin)
  - `FRONTEND_ORIGIN` (for CORS)

## Manual Checklist (user must do)

- [ ] Get SoundCloud `client_id` from SoundCloud developer portal
- [ ] Run `railway login` in terminal
- [ ] Create Railway project and add PostgreSQL plugin
- [ ] Add `SOUNDCLOUD_CLIENT_ID` env var in Railway dashboard
- [ ] Connect GitHub repo to Railway for auto-deploy
- [ ] Create GitHub repo and push (or I can do this with `gh` CLI if authenticated)
