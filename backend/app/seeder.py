"""
Crawl + seed pipeline.

seed_if_empty()  — fast first-boot bootstrap (Viberate page 0 + Deezer only).
reseed_all()     — full pipeline triggered by /api/admin/reseed:
   For each artist (all Viberate pages):
     1. Deezer top tracks. If > MIN_SONGS playable -> use Deezer.
     2. Else ask AI for the artist's SoundCloud + YouTube.
        Prefer SoundCloud (> MIN_SONGS) then YouTube (> MIN_SONGS).
     3. If no platform clears the bar -> mark artist not playable, store nothing.
   Image: Deezer -> Spotify -> SoundCloud/YouTube thumbnail.
"""
import asyncio
import logging
import re

import httpx

log = logging.getLogger(__name__)

BASE = "https://api.deezer.com"
MIN_SONGS = 10  # need MORE than this to keep an artist

VIBERATE_URL = "https://www.viberate.com/music-charts/top-artists-from-vietnam-{page}/"
VIBERATE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
}


# ---------------------------------------------------------------------------
# Viberate crawl
# ---------------------------------------------------------------------------

def _parse_viberate(html: str) -> list[dict]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    artists, seen = [], set()
    for link in soup.find_all("a", href=re.compile(r"^/artist/[^/]+/?$")):
        name = link.get_text(strip=True)
        if not name:
            continue
        slug = link.get("href", "").strip("/").split("/")[-1]
        if slug in seen:
            continue
        seen.add(slug)
        rank = genre = None
        elem = link
        for _ in range(8):
            elem = elem.parent
            if elem is None:
                break
            if rank is None:
                for strong in elem.find_all("strong"):
                    txt = strong.get_text(strip=True).replace(",", "").replace(".", "")
                    try:
                        c = int(txt)
                        if 1 <= c <= 99999:
                            rank = c
                            break
                    except ValueError:
                        pass
            if genre is None:
                g = elem.find("a", href=re.compile(r"^/genre/"))
                if g:
                    genre = g.get_text(strip=True)
            if rank is not None and genre is not None:
                break
        if name and rank:
            artists.append({"rank": rank, "name": name, "slug": slug, "genre": genre})
    return artists


async def _crawl_viberate(client: httpx.AsyncClient, pages: int) -> list[dict]:
    out, seen = [], set()
    for page in range(pages):
        try:
            resp = await client.get(
                VIBERATE_URL.format(page=page),
                headers=VIBERATE_HEADERS, timeout=25, follow_redirects=True,
            )
            if resp.status_code == 404:
                break
            artists = _parse_viberate(resp.text)
            if not artists:
                break
            for a in artists:
                if a["slug"] not in seen:
                    seen.add(a["slug"])
                    out.append(a)
            log.info("[crawl] Viberate page %d → %d artists (total %d)", page, len(artists), len(out))
            await asyncio.sleep(1.0)
        except Exception as e:
            log.warning("[crawl] Viberate page %d failed: %s", page, e)
            break
    return out


async def _save_artists(artists: list[dict]):
    from app.database import AsyncSessionLocal
    from app.models import Artist
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    async with AsyncSessionLocal() as db:
        for start in range(0, len(artists), 200):
            batch = artists[start:start + 200]
            stmt = pg_insert(Artist).values([
                {"rank": a["rank"], "name": a["name"], "slug": a["slug"],
                 "genre": a.get("genre"), "popularity": None, "avatar_url": None}
                for a in batch
            ]).on_conflict_do_update(
                index_elements=["slug"],
                set_={"rank": pg_insert(Artist).excluded.rank,
                      "name": pg_insert(Artist).excluded.name,
                      "genre": pg_insert(Artist).excluded.genre},
            )
            await db.execute(stmt)
        await db.commit()
    log.info("[crawl] saved %d artists", len(artists))


# ---------------------------------------------------------------------------
# Deezer
# ---------------------------------------------------------------------------

async def _deezer_artist(client: httpx.AsyncClient, name: str) -> dict | None:
    try:
        from app.deezer import _clean_artist_name, _name_matches
        clean = _clean_artist_name(name)
        resp = await client.get(f"{BASE}/search/artist", params={"q": clean, "limit": 10})
        if resp.status_code != 200:
            return None
        for item in resp.json().get("data", []):
            if _name_matches(clean, item.get("name", "")):
                return item
        return None
    except Exception:
        return None


async def _deezer_tracks(client: httpx.AsyncClient, artist: dict, name: str) -> list[dict]:
    try:
        resp = await client.get(f"{BASE}/artist/{artist['id']}/top", params={"limit": 50})
        if resp.status_code != 200:
            return []
        out = []
        for t in resp.json().get("data", []):
            if not t.get("preview"):
                continue
            out.append({
                "source": "deezer", "source_id": str(t["id"]),
                "title": t["title"], "artist": name,
                "cover_url": t.get("album", {}).get("cover_medium") or artist.get("picture_medium"),
                "permalink_url": t.get("link"),
            })
        return out
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Image fallback
# ---------------------------------------------------------------------------

async def _resolve_avatar(name: str, deezer_artist: dict | None, ai: dict) -> str | None:
    if deezer_artist:
        pic = deezer_artist.get("picture_medium") or deezer_artist.get("picture")
        if pic:
            return pic
    # Spotify
    try:
        from app import spotify
        profiles = await spotify.get_artist_profiles([name])
        if profiles and profiles[0].get("avatar_url"):
            return profiles[0]["avatar_url"]
    except Exception:
        pass
    # SoundCloud avatar
    try:
        from app import soundcloud
        sc_url = ai.get("soundcloud_url") or name
        av = await soundcloud.get_artist_avatar(sc_url)
        if av:
            return av
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Track storage
# ---------------------------------------------------------------------------

async def _store_tracks(tracks: list[dict]):
    from app.database import AsyncSessionLocal
    from app.models import Track
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    if not tracks:
        return
    async with AsyncSessionLocal() as db:
        stmt = pg_insert(Track).values([
            {"id": f"{t['source']}:{t['source_id']}", "title": t["title"][:300],
             "artist_name": t["artist_name"], "source": t["source"],
             "source_id": t["source_id"], "cover_url": t.get("cover_url"),
             "permalink_url": t.get("permalink_url")}
            for t in tracks
        ]).on_conflict_do_nothing(index_elements=["id"])
        await db.execute(stmt)
        await db.commit()


async def _set_artist(name: str, avatar: str | None, playable: bool):
    from app.database import AsyncSessionLocal
    from app.models import Artist
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        row = (await db.execute(select(Artist).where(Artist.name == name))).scalar_one_or_none()
        if row:
            if avatar:
                row.avatar_url = avatar
            row.playable = playable
            await db.commit()


# ---------------------------------------------------------------------------
# Per-artist resolution (the fallback chain)
# ---------------------------------------------------------------------------

async def _resolve_artist(client: httpx.AsyncClient, name: str) -> tuple[list[dict], str | None]:
    """Returns (tracks, avatar). tracks is [] if the artist should be skipped."""
    deezer_artist = await _deezer_artist(client, name)
    chosen: list[dict] = []
    ai: dict = {}

    if deezer_artist:
        dz = await _deezer_tracks(client, deezer_artist, name)
        if len(dz) > MIN_SONGS:
            chosen = dz

    # Deezer thin/missing → ask AI, then SoundCloud, then YouTube
    if not chosen:
        from app.ai_verify import find_artist_sources
        ai = await find_artist_sources(name)

        from app import soundcloud, youtube
        sc_url = ai.get("soundcloud_url") or name
        sc = await soundcloud.get_artist_tracks(sc_url, limit=50)
        for t in sc:
            t["artist"] = name
        if len(sc) > MIN_SONGS:
            chosen = sc

        if not chosen:
            yt_url = ai.get("youtube_url") or name
            yt = await youtube.search_artist_tracks(yt_url, limit=40)
            for t in yt:
                t["artist"] = name
            if len(yt) > MIN_SONGS:
                chosen = yt

    # Normalize artist_name key for storage
    for t in chosen:
        t["artist_name"] = name

    avatar = await _resolve_avatar(name, deezer_artist, ai)
    return chosen, avatar


# ---------------------------------------------------------------------------
# Public entry points
# ---------------------------------------------------------------------------

async def seed_if_empty():
    """Fast first-boot bootstrap — Deezer only, Viberate page 0."""
    await asyncio.sleep(5)
    try:
        from app.database import AsyncSessionLocal
        from app.models import Artist, Track
        from sqlalchemy import select, func

        async with AsyncSessionLocal() as db:
            tracks = (await db.execute(select(func.count()).select_from(Track))).scalar() or 0
            artists = (await db.execute(select(func.count()).select_from(Artist))).scalar() or 0
        if tracks >= 200 and artists >= 50:
            log.info("[seeder] already seeded (%d tracks, %d artists)", tracks, artists)
            return

        log.info("[seeder] first-boot bootstrap starting")
        async with httpx.AsyncClient(timeout=25) as client:
            vib = await _crawl_viberate(client, pages=1)
        if vib:
            await _save_artists(vib)
            names = [a["name"] for a in vib]
        else:
            return

        async with httpx.AsyncClient(timeout=15) as client:
            for i, name in enumerate(names):
                try:
                    artist = await _deezer_artist(client, name)
                    if artist:
                        dz = await _deezer_tracks(client, artist, name)
                        for t in dz:
                            t["artist_name"] = name
                        if dz:
                            await _store_tracks(dz)
                        avatar = artist.get("picture_medium") or artist.get("picture")
                        await _set_artist(name, avatar, playable=len(dz) > MIN_SONGS)
                except Exception as e:
                    log.warning("[seeder] %s: %s", name, e)
                await asyncio.sleep(0.4)
        log.info("[seeder] bootstrap done")
    except Exception as e:
        log.error("[seeder] fatal: %s", e)


_reseed_running = False


async def reseed_all(pages: int = 8) -> dict:
    global _reseed_running
    if _reseed_running:
        return {"status": "already_running"}
    _reseed_running = True
    try:
        from app.database import AsyncSessionLocal
        from sqlalchemy import text

        # Clean slate for the cache (disposable) so old-format rows don't linger
        async with AsyncSessionLocal() as db:
            await db.execute(text("DELETE FROM tracks"))
            await db.commit()

        async with httpx.AsyncClient(timeout=25) as client:
            vib = await _crawl_viberate(client, pages=pages)
        if not vib:
            return {"status": "error", "detail": "Viberate returned no artists"}
        await _save_artists(vib)
        names = [a["name"] for a in vib]
        log.info("[reseed] resolving %d artists", len(names))

        stats = {"deezer": 0, "soundcloud": 0, "youtube": 0, "skipped": 0, "tracks": 0}
        async with httpx.AsyncClient(timeout=20) as client:
            for i, name in enumerate(names):
                try:
                    tracks, avatar = await _resolve_artist(client, name)
                    if tracks:
                        await _store_tracks(tracks)
                        await _set_artist(name, avatar, playable=True)
                        src = tracks[0]["source"]
                        stats[src] = stats.get(src, 0) + 1
                        stats["tracks"] += len(tracks)
                    else:
                        await _set_artist(name, avatar, playable=False)
                        stats["skipped"] += 1
                except Exception as e:
                    log.warning("[reseed] %s: %s", name, e)
                    stats["skipped"] += 1
                if (i + 1) % 50 == 0:
                    log.info("[reseed] %d/%d %s", i + 1, len(names), stats)
                await asyncio.sleep(0.3)

        log.info("[reseed] complete %s", stats)
        return {"status": "ok", "artists": len(names), **stats}
    finally:
        _reseed_running = False
