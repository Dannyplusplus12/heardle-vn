from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func, or_

from app.deezer import search_tracks, search_tracks_by_artists

router = APIRouter(prefix="/api", tags=["search"])


async def _search_by_names(q: str, artists: list[str], limit: int) -> list[dict]:
    """Search DB cache scoped to artist names (legacy fan-cứng flow)."""
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


async def _search_pool(
    q: str,
    artist_ids: list[int],
    playlist_ids: list[int],
    limit: int = 10,
) -> list[dict]:
    """Pool-aware: only return tracks that belong to selected artists/playlists."""
    from app.database import AsyncSessionLocal
    from app.models import Track, PlaylistTrack

    async with AsyncSessionLocal() as db:
        pool_conditions = []

        if artist_ids:
            pool_conditions.append(Track.artist_id.in_(artist_ids))

        if playlist_ids:
            pt_result = await db.execute(
                select(PlaylistTrack.track_id).where(PlaylistTrack.playlist_id.in_(playlist_ids))
            )
            pl_track_ids = [r[0] for r in pt_result.all()]
            if pl_track_ids:
                pool_conditions.append(Track.id.in_(pl_track_ids))

        if not pool_conditions:
            return []

        query = (
            select(Track)
            .where(or_(*pool_conditions))
            .where(Track.title.ilike(f"%{q}%"))
            .limit(limit)
        )
        rows = (await db.execute(query)).scalars().all()

    return [{"id": r.id, "title": r.title, "artist": r.artist_name} for r in rows]


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1, max_length=100),
    artist_ids: Optional[str] = Query(default=None),   # pool-aware: DB IDs
    playlist_ids: Optional[str] = Query(default=None),  # pool-aware: playlist IDs
    artists: Optional[str] = Query(default=None),       # legacy: artist names
):
    try:
        if artist_ids or playlist_ids:
            parsed_artist_ids = [int(x) for x in artist_ids.split(",") if x.strip()] if artist_ids else []
            parsed_playlist_ids = [int(x) for x in playlist_ids.split(",") if x.strip()] if playlist_ids else []
            return await _search_pool(q, parsed_artist_ids, parsed_playlist_ids)

        if artists:
            artist_list = [a.strip() for a in artists.split(",") if a.strip()]
            cached = await _search_by_names(q, artist_list, limit=10)
            if cached:
                return cached
            return await search_tracks_by_artists(q, artist_list, limit=10)

        return await search_tracks(q, limit=10)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
