import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
import app.models  # noqa: F401 — registers models with Base
from app.routers import game, search, artists, auth, admin, playlists, doi_dau
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
                "ALTER TABLE artists ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true",
                "ALTER TABLE artists ADD COLUMN IF NOT EXISTS in_random boolean NOT NULL DEFAULT true",
                "ALTER TABLE artists ADD COLUMN IF NOT EXISTS zing_url text",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(50)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar(200)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text",
                "ALTER TABLE users ALTER COLUMN email DROP NOT NULL",
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (username) WHERE username IS NOT NULL",
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
app.include_router(doi_dau.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/admin/seed-zing-chart")
async def admin_seed_zing_chart(
    secret: str = Query(...),
    limit: int = Query(default=100, ge=10, le=200),
):
    """Seed tracks from Zing VP-Pop chart into DB. Runs in background."""
    if secret != _ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    async def _run():
        from app.zing import get_chart_tracks
        from app.database import AsyncSessionLocal
        from app.models import Track
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        tracks = await get_chart_tracks(limit=limit)
        if not tracks:
            return
        async with AsyncSessionLocal() as db:
            stmt = pg_insert(Track).values([
                {
                    "id": f"zing:{t['source_id']}",
                    "title": t["title"][:300],
                    "artist_name": t["artist"],
                    "artist_id": None,
                    "source": "zing",
                    "source_id": t["source_id"],
                    "cover_url": t.get("cover_url"),
                    "permalink_url": t.get("permalink_url"),
                    "duration_ms": t.get("duration_ms"),
                }
                for t in tracks
            ]).on_conflict_do_nothing(index_elements=["id"])
            await db.execute(stmt)
            await db.commit()
        import logging
        logging.getLogger(__name__).info("[zing-chart] seeded %d tracks", len(tracks))

    asyncio.create_task(_run())
    return {"status": "started", "limit": limit}


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
