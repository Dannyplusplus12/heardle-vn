from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.spotify import search_tracks, search_tracks_by_artists

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1, max_length=100),
    artists: Optional[str] = Query(default=None),
):
    try:
        if artists:
            artist_list = [a.strip() for a in artists.split(',') if a.strip()]
            return await search_tracks_by_artists(q, artist_list, limit=10)
        return await search_tracks(q, limit=10)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
