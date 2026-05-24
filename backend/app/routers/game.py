from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import httpx
from app.deezer import get_random_vietnamese_track, get_random_track_by_artists, get_preview_url

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/new")
async def new_game(
    genre: Optional[str] = Query(default=None),
    artists: Optional[str] = Query(default=None),
):
    try:
        if artists:
            artist_list = [a.strip() for a in artists.split(',') if a.strip()]
            return await get_random_track_by_artists(artist_list)
        return await get_random_vietnamese_track(genre)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/clip/{track_id}")
async def get_clip(track_id: str, full: bool = Query(default=False)):
    try:
        preview_url = await get_preview_url(track_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Preview error: {e}")

    async def proxy():
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("GET", preview_url) as resp:
                async for chunk in resp.aiter_bytes(4096):
                    yield chunk

    return StreamingResponse(
        proxy(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "Accept-Ranges": "none"},
    )
