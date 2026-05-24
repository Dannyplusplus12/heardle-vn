import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import httpx

from app.deezer import (
    get_random_vietnamese_track,
    get_random_track_by_artists,
    get_preview_url,
)
from app import soundcloud, youtube

router = APIRouter(prefix="/api/game", tags=["game"])

CLIP_SECONDS = 30


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


def _parse_track_id(track_id: str) -> tuple[str, str]:
    """'deezer:123' -> ('deezer', '123'). Bare ids default to deezer (legacy)."""
    if ":" in track_id:
        source, source_id = track_id.split(":", 1)
        return source, source_id
    return "deezer", track_id


async def _proxy(url: str):
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            async for chunk in resp.aiter_bytes(8192):
                yield chunk


async def _ffmpeg_clip(input_url: str, seconds: int | None):
    """Stream a transcoded MP3 clip from any input URL (HLS, webm, m4a...)."""
    args = ["ffmpeg", "-loglevel", "error"]
    if seconds:
        args += ["-t", str(seconds)]
    args += [
        "-i", input_url,
        "-vn", "-acodec", "libmp3lame", "-b:a", "128k", "-f", "mp3", "pipe:1",
    ]
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    try:
        while True:
            chunk = await proc.stdout.read(8192)
            if not chunk:
                break
            yield chunk
    finally:
        if proc.returncode is None:
            try:
                proc.kill()
            except ProcessLookupError:
                pass
        await proc.wait()


@router.get("/clip/{track_id}")
async def get_clip(track_id: str, full: bool = Query(default=False)):
    source, source_id = _parse_track_id(track_id)
    clip_len = None if full else CLIP_SECONDS

    try:
        if source == "deezer":
            # Deezer previews are already ~30s — proxy directly, no transcode needed.
            preview_url = await get_preview_url(source_id)
            return StreamingResponse(
                _proxy(preview_url),
                media_type="audio/mpeg",
                headers={"Cache-Control": "no-cache", "Accept-Ranges": "none"},
            )

        if source == "soundcloud":
            stream_url = await soundcloud.get_stream_url(source_id)
        elif source == "youtube":
            stream_url = await youtube.get_stream_url(source_id)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown source: {source}")

        if not stream_url:
            raise HTTPException(status_code=502, detail="No stream URL resolved")

        return StreamingResponse(
            _ffmpeg_clip(stream_url, clip_len),
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-cache", "Accept-Ranges": "none"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Clip error: {e}")
