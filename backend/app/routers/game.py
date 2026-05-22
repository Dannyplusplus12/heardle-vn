import asyncio
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.soundcloud import get_random_vietnamese_track, get_stream_url

router = APIRouter(prefix="/api/game", tags=["game"])

VALID_DURATIONS = {1, 5, 15, 30}


@router.get("/new")
async def new_game():
    try:
        return await get_random_vietnamese_track()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/clip/{track_id}")
async def get_clip(track_id: str, duration: int = Query(default=1)):
    if duration not in VALID_DURATIONS:
        raise HTTPException(status_code=400, detail="duration must be 1, 5, 15, or 30")
    try:
        stream_url = await get_stream_url(track_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stream error: {e}")

    async def generate():
        process = await asyncio.create_subprocess_exec(
            "ffmpeg", "-i", stream_url,
            "-t", str(duration),
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
