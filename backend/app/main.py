import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os

from app.database import engine, Base
import app.models  # noqa: F401 — registers models with Base
from app.routers import game, search, artists
from app.seeder import seed_if_empty, reseed_all

logging.basicConfig(level=logging.INFO)

_ADMIN_SECRET = os.getenv("ADMIN_SECRET", "heardle-vn-admin-2026")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[startup] DB unavailable, skipping table creation: {e}")
    asyncio.create_task(seed_if_empty())
    yield


app = FastAPI(title="Heardle VN API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(game.router)
app.include_router(search.router)
app.include_router(artists.router)


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
