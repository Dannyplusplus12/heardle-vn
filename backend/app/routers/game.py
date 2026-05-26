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
from app import soundcloud, youtube, zing

router = APIRouter(prefix="/api/game", tags=["game"])

CLIP_SECONDS = 30


async def _random_from_genre(genre: str | None, difficulty: str | None = None) -> dict | None:
    """Pick a random track from DB filtered by genre and rank-based difficulty tier."""
    from app.database import AsyncSessionLocal
    from app.models import Track, Artist
    from sqlalchemy import select, or_
    from sqlalchemy import func as sqlfunc

    async with AsyncSessionLocal() as db:
        # Build artist filter for genre
        artist_q = select(Artist.id).where(Artist.in_random.is_(True))
        if genre and genre != "all":
            if genre == "pop":
                artist_q = artist_q.where(sqlfunc.lower(Artist.genre).contains("pop"))
            elif genre == "hiphop":
                artist_q = artist_q.where(
                    or_(
                        sqlfunc.lower(Artist.genre).contains("hip"),
                        sqlfunc.lower(Artist.genre).contains("rap"),
                    )
                )
        artist_q = artist_q.order_by(Artist.rank)
        all_artist_ids = [r[0] for r in (await db.execute(artist_q)).all()]

        # Slice by difficulty tier (genre-relative ranking)
        if difficulty == "easy":
            artist_ids = all_artist_ids[:10]
        elif difficulty == "medium":
            artist_ids = all_artist_ids[10:50]
        elif difficulty == "hard":
            artist_ids = all_artist_ids[50:]
        else:
            artist_ids = all_artist_ids

        # Fall back to full genre pool if tier is empty
        if not artist_ids:
            artist_ids = all_artist_ids
        if not artist_ids:
            return None

        q = (
            select(Track)
            .where(Track.artist_id.in_(artist_ids))
            .order_by(sqlfunc.random())
            .limit(1)
        )
        track = (await db.execute(q)).scalar_one_or_none()

    if not track:
        return None

    return {
        "id": track.id,
        "title": track.title,
        "artist": track.artist_name,
        "cover_url": track.cover_url or "",
        "permalink_url": track.permalink_url or "",
    }


async def _random_from_pool(artist_ids: list[int], playlist_ids: list[int]) -> dict:
    from app.database import AsyncSessionLocal
    from app.models import Track, PlaylistTrack
    from sqlalchemy import select, or_
    from sqlalchemy import func as sqlfunc

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
            raise RuntimeError("Empty pool — no artists or playlists selected")

        q = (
            select(Track)
            .where(or_(*pool_conditions))
            .order_by(sqlfunc.random())
            .limit(1)
        )
        track = (await db.execute(q)).scalar_one_or_none()

    if not track:
        raise RuntimeError("No tracks found — crawl the selected artists first")

    return {
        "id": track.id,
        "title": track.title,
        "artist": track.artist_name,
        "cover_url": track.cover_url or "",
        "permalink_url": track.permalink_url or "",
    }


@router.get("/new")
async def new_game(
    genre: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),   # 'easy' | 'medium' | 'hard'
    artists: Optional[str] = Query(default=None),       # legacy: comma-sep names
    artist_ids: Optional[str] = Query(default=None),    # pool-aware: comma-sep DB IDs
    playlist_ids: Optional[str] = Query(default=None),  # pool-aware: comma-sep playlist IDs
):
    try:
        if artist_ids or playlist_ids:
            parsed_artist_ids = [int(x) for x in artist_ids.split(",") if x.strip()] if artist_ids else []
            parsed_playlist_ids = [int(x) for x in playlist_ids.split(",") if x.strip()] if playlist_ids else []
            return await _random_from_pool(parsed_artist_ids, parsed_playlist_ids)

        if artists:
            artist_list = [a.strip() for a in artists.split(",") if a.strip()]
            return await get_random_track_by_artists(artist_list)

        db_result = await _random_from_genre(genre, difficulty)
        if db_result:
            return db_result
        # Fallback: Deezer curated list (treat 'all' same as no genre)
        return await get_random_vietnamese_track(None if genre == "all" else genre)
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
        elif source == "zing":
            stream_url = await zing.get_stream_url(source_id)
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
