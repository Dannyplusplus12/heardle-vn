"""
Background seeder — runs at startup if the tracks table is mostly empty.

On first run (empty DB):
  1. Crawls Viberate page 0 → inserts ~300 Vietnamese artists into `artists` table
  2. For each artist, fetches Deezer top tracks + avatar and persists them

Subsequent runs (DB already populated):
  - Skips immediately (tracks >= 50 rows)
"""
import asyncio
import logging
import re

import httpx

log = logging.getLogger(__name__)

BASE = "https://api.deezer.com"
VIBERATE_URL = "https://www.viberate.com/music-charts/top-artists-from-vietnam-{page}/"
VIBERATE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
}

# Fallback if Viberate crawl fails — used for track seeding even without DB artists
_SEED_ARTISTS = [
    "Son Tung MTP", "HIEUTHUHAI", "Den Vau", "Hoa Minzy", "SOOBIN",
    "JustaTee", "Bui Truong Linh", "Vu.", "Jack J97", "MIN",
    "RPT MCK", "Obito", "Mr Siro", "Quan A.P", "Chau Khai Phong",
    "Duc Phuc", "Low G", "ACV", "Phung Khanh Linh", "Erik",
    "Quang Hung MasterD", "Duong Domic", "tlinh", "My Tam", "Le Bao Binh",
    "AMEE", "Phuong Ly", "Bich Phuong", "Phan Manh Quynh", "Huong Giang",
    "Noo Phuoc Thinh", "Phuong My Chi", "Van Mai Huong", "Wxrdie", "Da LAB",
    "Bao Anh", "Masew", "Karik", "Thanh Hung", "MONSTAR",
    "Quang Anh Rhyder", "Hoang Dung", "Ngo Lan Huong", "Ha Anh Tuan", "Negav",
    "Lam Chan Khang", "Vu Cat Tuong", "B Ray", "Ngo Kien Huy", "Hoang Thuy Linh",
    "Truc Nhan", "Dat G", "Dam Vinh Hung", "Orange", "Toc Tien",
    "Ngot", "Quoc Thien", "Juky San", "Ho Quang Hieu", "Hien Ho",
    "Rhymastic", "Ho Viet Trung", "LyLy", "Tuan Hung", "Chillies",
    "Hoai Lam", "Dong Nhi", "Lou Hoang", "Phao", "Tang Duy Tan",
    "Miu Le", "Han Sara", "Only C", "Ho Ngoc Ha", "DatKaa",
    "Dinh Dung", "MONO", "Anh Tu Atus", "Thuy Chi", "GREY D",
    "Wren Evans", "Andree Right Hand", "Isaac", "Trung Quan", "HURRYKNG",
    "Thinh Suy", "Thieu Bao Tram", "Hoang Ton", "Binh Gold", "Trinh Thang Binh",
    "Minh Hang", "BigDaddy", "The Men", "Dan Truong", "Bui Anh Tuan",
    "Tang Phuc", "Jun Pham", "Bui Cong Nam", "Duy Manh", "Chi Dan",
    "Gin Tuan Kiet", "Wowy", "Huong Tram", "Suboi", "Kai Dinh",
    "Suni Ha Linh", "Cam Ly", "Le Quyen", "Tien Tien", "Nguyen Tran Trung Quan",
    "Thuy Tien", "HuyR", "Osad", "De Choat", "Le Thien Hieu",
    "My Linh", "Nguyen Dinh Vu", "Lynk Lee", "Khac Viet", "Lam Truong",
    "Song Luan", "Hua Kim Tuyen", "Bao Thy", "Tuan Vu", "Nhu Quynh",
    "Quang Ha", "Minh Tuyet", "Yen Trang", "Phi Phuong Anh", "Thanh Thao",
    "Ho Quynh Huong", "Uyen Linh", "Lam Chan Huy", "Gill", "Seachains",
    "Kimmese", "Cukak", "Khoi My", "Luu Huong Giang", "Quang Le",
    "Trang Phap", "Hannie", "Trung Kien", "Ho Van Cuong", "Cara",
    "Thai Trinh", "Vo Ha Tram", "Uni5", "Mlee", "SOL7",
]


# ---------------------------------------------------------------------------
# Viberate crawl helpers
# ---------------------------------------------------------------------------

def _parse_viberate(html: str) -> list[dict]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    artists = []
    seen: set[str] = set()

    artist_links = soup.find_all("a", href=re.compile(r"^/artist/[^/]+/?$"))
    for link in artist_links:
        name = link.get_text(strip=True)
        if not name:
            continue
        href = link.get("href", "")
        slug = href.strip("/").split("/")[-1]
        if slug in seen:
            continue
        seen.add(slug)

        rank = None
        genre = None
        elem = link
        for _ in range(8):
            elem = elem.parent
            if elem is None:
                break
            if rank is None:
                for strong in elem.find_all("strong"):
                    text = strong.get_text(strip=True).replace(",", "").replace(".", "")
                    try:
                        c = int(text)
                        if 1 <= c <= 99999:
                            rank = c
                            break
                    except ValueError:
                        pass
            if genre is None:
                g_link = elem.find("a", href=re.compile(r"^/genre/"))
                if g_link:
                    genre = g_link.get_text(strip=True)
            if rank is not None and genre is not None:
                break

        if name and rank:
            artists.append({"rank": rank, "name": name, "slug": slug, "genre": genre})

    return artists


async def _crawl_viberate(client: httpx.AsyncClient, pages: int = 1) -> list[dict]:
    all_artists: list[dict] = []
    seen_slugs: set[str] = set()
    for page in range(pages):
        try:
            resp = await client.get(
                VIBERATE_URL.format(page=page),
                headers=VIBERATE_HEADERS,
                timeout=25,
                follow_redirects=True,
            )
            if resp.status_code == 404:
                break
            artists = _parse_viberate(resp.text)
            if not artists:
                break
            for a in artists:
                if a["slug"] not in seen_slugs:
                    seen_slugs.add(a["slug"])
                    all_artists.append(a)
            log.info("[seeder] Viberate page %d → %d new artists", page, len(artists))
            await asyncio.sleep(1.0)
        except Exception as e:
            log.warning("[seeder] Viberate page %d failed: %s", page, e)
            break
    return all_artists


async def _save_viberate_artists(artists: list[dict]):
    from app.database import AsyncSessionLocal
    from app.models import Artist
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    async with AsyncSessionLocal() as db:
        stmt = pg_insert(Artist).values([
            {
                "rank": a["rank"],
                "name": a["name"],
                "slug": a["slug"],
                "genre": a.get("genre"),
                "popularity": None,
                "avatar_url": None,
            }
            for a in artists
        ]).on_conflict_do_update(
            index_elements=["slug"],
            set_={
                "rank": pg_insert(Artist).excluded.rank,
                "name": pg_insert(Artist).excluded.name,
                "genre": pg_insert(Artist).excluded.genre,
            },
        )
        await db.execute(stmt)
        await db.commit()
    log.info("[seeder] saved %d Viberate artists to DB", len(artists))


# ---------------------------------------------------------------------------
# Deezer fetch helpers
# ---------------------------------------------------------------------------

async def _find_artist(client: httpx.AsyncClient, name: str) -> dict | None:
    try:
        from app.deezer import _clean_artist_name, _name_matches
        clean = _clean_artist_name(name)
        resp = await client.get(f"{BASE}/search/artist", params={"q": clean, "limit": 10})
        if resp.status_code != 200:
            return None
        items = resp.json().get("data", [])
        for item in items:
            if _name_matches(clean, item.get("name", "")):
                return item
        return None
    except Exception:
        return None


async def _top_tracks(client: httpx.AsyncClient, artist_id: int) -> list[dict]:
    try:
        resp = await client.get(f"{BASE}/artist/{artist_id}/top", params={"limit": 50})
        if resp.status_code != 200:
            return []
        return [t for t in resp.json().get("data", []) if t.get("preview")]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Main seeder entry point
# ---------------------------------------------------------------------------

async def seed_if_empty():
    await asyncio.sleep(5)  # Give DB a moment after startup

    try:
        from app.database import AsyncSessionLocal
        from app.models import Artist, Track
        from sqlalchemy import select, func
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        # Skip only if BOTH tracks and artists are already populated
        async with AsyncSessionLocal() as db:
            track_count = (await db.execute(select(func.count()).select_from(Track))).scalar() or 0
            artist_count = (await db.execute(select(func.count()).select_from(Artist))).scalar() or 0
        if track_count >= 200 and artist_count >= 50:
            log.info("[seeder] already seeded (%d tracks, %d artists), skipping", track_count, artist_count)
            return

        log.info("[seeder] starting first-time DB seed")

        # Step 1: crawl Viberate to populate artists table
        async with httpx.AsyncClient(timeout=25) as client:
            vib_artists = await _crawl_viberate(client, pages=1)

        if vib_artists:
            await _save_viberate_artists(vib_artists)
            names = [a["name"] for a in vib_artists]
        else:
            log.warning("[seeder] Viberate crawl empty, falling back to hardcoded list")
            names = _SEED_ARTISTS
            # Create stub Artist rows from fallback so avatar_url can be persisted
            from app.models import Artist
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            async with AsyncSessionLocal() as db:
                stmt = pg_insert(Artist).values([
                    {
                        "rank": i + 1,
                        "name": n,
                        "slug": n.lower().replace(" ", "-"),
                        "genre": None,
                        "popularity": None,
                        "avatar_url": None,
                    }
                    for i, n in enumerate(names)
                ]).on_conflict_do_nothing(index_elements=["slug"])
                await db.execute(stmt)
                await db.commit()

        log.info("[seeder] seeding Deezer data for %d artists", len(names))

        # Step 2: for each artist, fetch Deezer avatar + top tracks
        async with httpx.AsyncClient(timeout=15) as client:
            for i, name in enumerate(names):
                try:
                    artist = await _find_artist(client, name)
                    if not artist:
                        await asyncio.sleep(0.3)
                        continue

                    avatar = artist.get("picture_medium") or artist.get("picture")
                    tracks = await _top_tracks(client, artist["id"])

                    async with AsyncSessionLocal() as db:
                        # Persist avatar to artists table
                        if avatar:
                            row = (await db.execute(
                                select(Artist).where(Artist.name == name)
                            )).scalar_one_or_none()
                            if row and not row.avatar_url:
                                row.avatar_url = avatar

                        # Upsert tracks
                        if tracks:
                            stmt = pg_insert(Track).values([
                                {
                                    "id": str(t["id"]),
                                    "title": t["title"],
                                    "artist_name": name,
                                    "cover_url": (
                                        t.get("album", {}).get("cover_medium")
                                        or artist.get("picture_medium")
                                    ),
                                    "permalink_url": t.get("link"),
                                }
                                for t in tracks
                            ]).on_conflict_do_nothing(index_elements=["id"])
                            await db.execute(stmt)

                        await db.commit()

                    log.info(
                        "[seeder] (%d/%d) %s → %d tracks",
                        i + 1, len(names), name, len(tracks),
                    )
                except Exception as e:
                    log.warning("[seeder] skipped %s: %s", name, e)

                await asyncio.sleep(0.4)

        log.info("[seeder] done — tracks table populated")

    except Exception as e:
        log.error("[seeder] fatal error: %s", e)


# ---------------------------------------------------------------------------
# Full reseed — called by the admin endpoint, always runs all pages
# ---------------------------------------------------------------------------

_reseed_running = False


async def reseed_all(pages: int = 8) -> dict:
    global _reseed_running
    if _reseed_running:
        return {"status": "already_running"}
    _reseed_running = True
    try:
        from app.database import AsyncSessionLocal
        from app.models import Artist, Track
        from sqlalchemy import select
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        # Crawl all Viberate pages
        async with httpx.AsyncClient(timeout=25) as client:
            vib_artists = await _crawl_viberate(client, pages=pages)

        if not vib_artists:
            log.warning("[reseed] Viberate crawl returned 0 artists")
            return {"status": "error", "detail": "Viberate returned no artists"}

        await _save_viberate_artists(vib_artists)
        names = [a["name"] for a in vib_artists]
        log.info("[reseed] crawled %d artists, now seeding Deezer data", len(names))

        seeded_tracks = 0
        seeded_avatars = 0

        async with httpx.AsyncClient(timeout=15) as client:
            for i, name in enumerate(names):
                try:
                    artist = await _find_artist(client, name)
                    if not artist:
                        await asyncio.sleep(0.3)
                        continue

                    avatar = artist.get("picture_medium") or artist.get("picture")
                    tracks = await _top_tracks(client, artist["id"])

                    async with AsyncSessionLocal() as db:
                        if avatar:
                            row = (await db.execute(
                                select(Artist).where(Artist.name == name)
                            )).scalar_one_or_none()
                            if row and row.avatar_url != avatar:
                                row.avatar_url = avatar
                                seeded_avatars += 1

                        if tracks:
                            stmt = pg_insert(Track).values([
                                {
                                    "id": str(t["id"]),
                                    "title": t["title"],
                                    "artist_name": name,
                                    "cover_url": (
                                        t.get("album", {}).get("cover_medium")
                                        or artist.get("picture_medium")
                                    ),
                                    "permalink_url": t.get("link"),
                                }
                                for t in tracks
                            ]).on_conflict_do_nothing(index_elements=["id"])
                            await db.execute(stmt)
                            seeded_tracks += len(tracks)

                        await db.commit()

                    if (i + 1) % 50 == 0:
                        log.info("[reseed] progress %d/%d", i + 1, len(names))
                except Exception as e:
                    log.warning("[reseed] skipped %s: %s", name, e)

                await asyncio.sleep(0.4)

        log.info("[reseed] complete — %d tracks, %d avatars", seeded_tracks, seeded_avatars)
        return {
            "status": "ok",
            "artists_crawled": len(names),
            "tracks_seeded": seeded_tracks,
            "avatars_updated": seeded_avatars,
        }
    finally:
        _reseed_running = False
