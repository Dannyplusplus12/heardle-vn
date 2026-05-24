import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
import app.models  # noqa: F401 — registers models with Base
from app.routers import game, search, artists, auth, admin, playlists
from app.seeder import seed_if_empty, reseed_all

logging.basicConfig(level=logging.INFO)

_ADMIN_SECRET = os.getenv("ADMIN_SECRET", "heardle-vn-admin-2026")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Idempotent migrations for pre-existing tables
            for stmt in [
                "ALTER TABLE tracks ADD COLUMN IF NOT EXISTS source varchar(20) DEFAULT 'deezer'",
                "ALTER TABLE tracks ADD COLUMN IF NOT EXISTS source_id varchar(80)",
                "ALTER TABLE tracks ADD COLUMN IF NOT EXISTS artist_id integer",
                "ALTER TABLE tracks ADD COLUMN IF NOT EXISTS duration_ms integer",
                "ALTER TABLE artists ADD COLUMN IF NOT EXISTS playable boolean NOT NULL DEFAULT true",
                "ALTER TABLE artists ADD COLUMN IF NOT EXISTS description text",
                "ALTER TABLE artists ADD COLUMN IF NOT EXISTS soundcloud_url text",
                "ALTER TABLE artists ADD COLUMN IF NOT EXISTS youtube_url text",
                "ALTER TABLE artists ADD COLUMN IF NOT EXISTS needs_manual_url boolean NOT NULL DEFAULT false",
                # Backfill artist_id on existing tracks by matching artist_name → artists.name
                """
                UPDATE tracks t
                SET artist_id = a.id
                FROM artists a
                WHERE lower(t.artist_name) = lower(a.name)
                  AND t.artist_id IS NULL
                """,
            ]:
                await conn.execute(text(stmt))
    except Exception as e:
        print(f"[startup] DB unavailable, skipping table creation: {e}")
    asyncio.create_task(seed_if_empty())
    yield


app = FastAPI(title="Heardle VN API", lifespan=lifespan)

_FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(game.router)
app.include_router(search.router)
app.include_router(artists.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(playlists.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/admin/reseed")
async def admin_reseed(
    secret: str = Query(...),
    pages: int = Query(default=8, ge=1, le=20),
):
    """Trigger a full Viberate crawl + Deezer track seed. Runs in background."""
    if secret != _ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
    asyncio.create_task(reseed_all(pages=pages))
    return {"status": "started", "pages": pages, "message": "Reseed running in background — check server logs"}
