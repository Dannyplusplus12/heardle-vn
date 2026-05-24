from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func

from app.deezer import search_tracks, search_tracks_by_artists

router = APIRouter(prefix="/api", tags=["search"])


async def _search_cached(q: str, artists: list[str], limit: int) -> list[dict]:
    """Search the Track cache scoped to the selected artists, so guess options
    carry the same composite ids as the (cached) answer track."""
    from app.database import AsyncSessionLocal
    from app.models import Track
    lower = [a.lower() for a in artists]
    async with AsyncSessionLocal() as db:
        query = (
            select(Track)
            .where(func.lower(Track.artist_name).in_(lower))
            .where(Track.title.ilike(f"%{q}%"))
            .limit(limit)
        )
        rows = (await db.execute(query)).scalars().all()
    return [{"id": r.id, "title": r.title, "artist": r.artist_name} for r in rows]


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1, max_length=100),
    artists: Optional[str] = Query(default=None),
):
    try:
        if artists:
            artist_list = [a.strip() for a in artists.split(',') if a.strip()]
            cached = await _search_cached(q, artist_list, limit=10)
            if cached:
                return cached
            return await search_tracks_by_artists(q, artist_list, limit=10)
        return await search_tracks(q, limit=10)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
