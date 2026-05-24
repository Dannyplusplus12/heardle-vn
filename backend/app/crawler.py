import asyncio
import json
import logging

import httpx

log = logging.getLogger(__name__)


async def crawl_artist_deezer(artist_db_id: int, artist_name: str) -> dict:
    """
    Crawl Deezer for artist tracks and save them to DB.
    Returns {status: 'ok'|'no_tracks'|'low_activity'|'error', track_count: int}
    Conditions:
      - 0 preview tracks  → mark needs_manual_url=True, return 'no_tracks'
      - 1–5 tracks        → low activity, skip tracks but return 'low_activity'
      - 6+ tracks         → save tracks, return 'ok'
    """
    from app.deezer import _find_artist, BASE
    from app.database import AsyncSessionLocal
    from app.models import Track, Artist

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            artist = await _find_artist(client, artist_name)
            if not artist:
                log.warning("[crawler] Artist not found on Deezer: %s", artist_name)
                async with AsyncSessionLocal() as db:
                    row = await db.get(Artist, artist_db_id)
                    if row:
                        row.needs_manual_url = True
                        await db.commit()
                return {"status": "no_tracks", "track_count": 0}

            resp = await client.get(
                f"{BASE}/artist/{artist['id']}/top",
                params={"limit": 100},
            )
            if resp.status_code != 200:
                return {"status": "no_tracks", "track_count": 0}

            tracks = [t for t in resp.json().get("data", []) if t.get("preview")]

        if len(tracks) == 0:
            async with AsyncSessionLocal() as db:
                row = await db.get(Artist, artist_db_id)
                if row:
                    row.needs_manual_url = True
                    await db.commit()
            return {"status": "no_tracks", "track_count": 0}

        if len(tracks) <= 5:
            return {"status": "low_activity", "track_count": len(tracks)}

        async with AsyncSessionLocal() as db:
            db_artist = await db.get(Artist, artist_db_id)
            if db_artist and not db_artist.avatar_url:
                db_artist.avatar_url = artist.get("picture_medium")

            saved = 0
            for t in tracks:
                album = t.get("album", {})
                track_id = f"deezer:{t['id']}"
                existing = await db.get(Track, track_id)
                if existing:
                    if existing.artist_id is None:
                        existing.artist_id = artist_db_id
                else:
                    db.add(Track(
                        id=track_id,
                        title=t["title"],
                        artist_name=artist_name,
                        artist_id=artist_db_id,
                        source="deezer",
                        source_id=str(t["id"]),
                        cover_url=album.get("cover_medium") or artist.get("picture_medium"),
                        permalink_url=t.get("link", ""),
                        duration_ms=(t.get("duration") or 0) * 1000,
                    ))
                    saved += 1
            await db.commit()

        log.info("[crawler] %s: saved %d new Deezer tracks", artist_name, saved)
        return {"status": "ok", "track_count": len(tracks)}

    except Exception as e:
        log.error("[crawler] Deezer crawl failed for %s: %s", artist_name, e)
        return {"status": "error", "error": str(e), "track_count": 0}


async def crawl_artist_soundcloud(artist_db_id: int, artist_name: str, soundcloud_url: str) -> dict:
    """Crawl track metadata from a SoundCloud artist URL via yt-dlp (no audio download)."""
    from app.database import AsyncSessionLocal
    from app.models import Track

    try:
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp",
            "--flat-playlist",
            "--dump-json",
            "--no-download",
            "--playlist-end", "100",
            soundcloud_url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=60)
        lines = [ln.strip() for ln in stdout.decode().splitlines() if ln.strip()]

        saved = 0
        async with AsyncSessionLocal() as db:
            for line in lines:
                try:
                    entry = json.loads(line)
                    sc_id = str(entry.get("id", ""))
                    if not sc_id:
                        continue
                    track_id = f"soundcloud:{sc_id}"
                    existing = await db.get(Track, track_id)
                    if not existing:
                        db.add(Track(
                            id=track_id,
                            title=entry.get("title", "Unknown"),
                            artist_name=artist_name,
                            artist_id=artist_db_id,
                            source="soundcloud",
                            source_id=sc_id,
                            cover_url=entry.get("thumbnail"),
                            permalink_url=entry.get("webpage_url", soundcloud_url),
                            duration_ms=int((entry.get("duration") or 0) * 1000),
                        ))
                        saved += 1
                except Exception:
                    continue
            await db.commit()

        log.info("[crawler] %s: saved %d tracks from SoundCloud", artist_name, saved)
        return {"status": "ok", "track_count": saved}

    except asyncio.TimeoutError:
        return {"status": "error", "error": "yt-dlp timeout", "track_count": 0}
    except Exception as e:
        log.error("[crawler] SoundCloud crawl failed for %s: %s", artist_name, e)
        return {"status": "error", "error": str(e), "track_count": 0}


async def crawl_artist_youtube(artist_db_id: int, artist_name: str, youtube_url: str) -> dict:
    """Crawl track metadata from a YouTube channel URL via yt-dlp (no audio download)."""
    from app.database import AsyncSessionLocal
    from app.models import Track

    try:
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp",
            "--flat-playlist",
            "--dump-json",
            "--no-download",
            "--playlist-end", "100",
            youtube_url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=90)
        lines = [ln.strip() for ln in stdout.decode().splitlines() if ln.strip()]

        saved = 0
        async with AsyncSessionLocal() as db:
            for line in lines:
                try:
                    entry = json.loads(line)
                    yt_id = entry.get("id", "")
                    if not yt_id:
                        continue
                    track_id = f"youtube:{yt_id}"
                    existing = await db.get(Track, track_id)
                    if not existing:
                        db.add(Track(
                            id=track_id,
                            title=entry.get("title", "Unknown"),
                            artist_name=artist_name,
                            artist_id=artist_db_id,
                            source="youtube",
                            source_id=yt_id,
                            cover_url=entry.get("thumbnail"),
                            permalink_url=f"https://youtube.com/watch?v={yt_id}",
                            duration_ms=int((entry.get("duration") or 0) * 1000),
                        ))
                        saved += 1
                except Exception:
                    continue
            await db.commit()

        log.info("[crawler] %s: saved %d tracks from YouTube", artist_name, saved)
        return {"status": "ok", "track_count": saved}

    except asyncio.TimeoutError:
        return {"status": "error", "error": "yt-dlp timeout", "track_count": 0}
    except Exception as e:
        log.error("[crawler] YouTube crawl failed for %s: %s", artist_name, e)
        return {"status": "error", "error": str(e), "track_count": 0}
