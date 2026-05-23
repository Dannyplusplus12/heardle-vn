import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import httpx
from app.soundcloud import get_random_vietnamese_track, get_stream_url

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/new")
async def new_game(genre: Optional[str] = Query(default=None)):
    try:
        return await get_random_vietnamese_track(genre)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/clip/{track_id}")
async def get_clip(track_id: str, full: bool = Query(default=False)):
    try:
        stream_url = await get_stream_url(track_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Preview error: {e}")

    if full:
        # Proxy full track without time limit
        async def generate_full():
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream("GET", stream_url) as resp:
                    async for chunk in resp.aiter_bytes(4096):
                        yield chunk

        return StreamingResponse(
            generate_full(),
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-cache", "Accept-Ranges": "none"},
        )

    async def generate():
        process = await asyncio.create_subprocess_exec(
            "ffmpeg", "-i", stream_url,
            "-t", "30",
            "-f", "mp3", "-vn", "-q:a", "9",
            "pipe:1",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        try:
            while True:
                chunk = await process.stdout.read(4096)
                if not chunk:
                    break
                yield chunk
        finally:
            await process.wait()

    return StreamingResponse(
        generate(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "Accept-Ranges": "none"},
    )
