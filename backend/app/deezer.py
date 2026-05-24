import asyncio
import random
import re
import httpx

BASE = "https://api.deezer.com"


def _clean_artist_name(name: str) -> str:
    """Strip disambiguation suffixes that confuse Deezer search."""
    # Remove "a.k.a ALIAS" or "aka ALIAS"
    name = re.sub(r'\ba\.?k\.?a\.?\s+\S+.*', '', name, flags=re.IGNORECASE)
    # Remove trailing parentheticals like "(official)" or "(VN)"
    name = re.sub(r'\s*\(.*?\)\s*', ' ', name)
    # Collapse extra whitespace
    return name.strip()


def _name_matches(query: str, result_name: str) -> bool:
    """
    True if the Deezer result is a plausible match for our query.
    Requires at least one meaningful word (>2 chars) to overlap,
    which filters out totally unrelated artists while allowing
    diacritic differences (e.g. "Den Vau" vs "Đen Vâu").
    """
    def words(s: str) -> set[str]:
        return {w for w in re.sub(r'[^a-z0-9\s]', '', s.lower()).split() if len(w) > 2}

    return bool(words(query) & words(result_name))

# Curated Vietnamese artist pool — random mode picks from here to guarantee VN music
_VN_ARTISTS = [
    "Son Tung MTP", "HIEUTHUHAI", "tlinh", "Wren Evans", "Hoang Thuy Linh",
    "Den Vau", "MONO", "Tang Duy Tan", "My Tam", "Bich Phuong",
    "AMEE", "Erik", "Grey D", "Binz", "Jack J97",
    "Obito", "Da LAB", "Phuong My Chi", "Vu Cat Tuong", "Bray",
    "Noo Phuoc Thinh", "RPT MCK", "Duy Manh", "Bao Thy",
    "Tuan Hung", "Ho Ngoc Ha", "Dong Nhi", "Lam Truong", "Dan Truong",
    "Huong Tram", "Chi Pu", "MIN", "Only C", "Lou Hoang",
    "Isaac", "Trung Quan", "Quang Ha", "Ha Anh Tuan", "Le Quyen",
    "Duc Phuc", "Hua Kim Tuyen", "Thanh Hung", "Justatee", "Karik",
    "B Ray", "Wxrdie", "Rhymastic", "Suboi", "LK",
]

_GENRE_ARTISTS = {
    "pop":    ["Son Tung MTP", "AMEE", "Erik", "MONO", "Wren Evans", "Tang Duy Tan",
               "Bich Phuong", "Isaac", "Chi Pu", "Duc Phuc", "Hua Kim Tuyen",
               "Ho Ngoc Ha", "My Tam", "Dong Nhi", "Lou Hoang"],
    "indie":  ["Grey D", "Vu Cat Tuong", "Da LAB", "Ha Anh Tuan", "Bray",
               "Phuong My Chi", "Trung Quan"],
    "hiphop": ["HIEUTHUHAI", "tlinh", "Binz", "Den Vau", "Obito",
               "RPT MCK", "Jack J97", "Only C", "Justatee", "Karik",
               "B Ray", "Wxrdie", "Rhymastic", "Suboi", "LK"],
    "rock":   ["Da LAB", "Bray", "Lam Truong"],
}


def _track_fmt(t: dict, artist_override: dict | None = None) -> dict:
    artist = artist_override or t.get("artist", {})
    album = t.get("album", {})
    return {
        "id": str(t["id"]),
        "title": t["title"],
        "artist": artist.get("name", ""),
        "cover_url": album.get("cover_medium") or artist.get("picture_medium", ""),
        "permalink_url": t.get("link", ""),
    }


async def _find_artist(client: httpx.AsyncClient, name: str) -> dict | None:
    clean = _clean_artist_name(name)
    resp = await client.get(f"{BASE}/search/artist", params={"q": clean, "limit": 10})
    if resp.status_code != 200:
        return None
    items = resp.json().get("data", [])
    if not items:
        return None
    # Prefer a result whose name shares at least one meaningful word with our query
    for item in items:
        if _name_matches(clean, item.get("name", "")):
            return item
    # Nothing matched — return None rather than a wrong artist's photo
    return None


async def _random_track_from_artist(client: httpx.AsyncClient, artist_name: str) -> dict | None:
    artist = await _find_artist(client, artist_name)
    if not artist:
        return None
    resp = await client.get(f"{BASE}/artist/{artist['id']}/top", params={"limit": 50})
    if resp.status_code != 200:
        return None
    tracks = [t for t in resp.json().get("data", []) if t.get("preview")]
    if not tracks:
        return None
    return _track_fmt(random.choice(tracks), artist_override=artist)


async def get_random_vietnamese_track(genre: str | None = None) -> dict:
    pool = _GENRE_ARTISTS.get(genre, _VN_ARTISTS) if genre else _VN_ARTISTS
    # Shuffle so we try different artists on retry
    candidates = random.sample(pool, min(len(pool), 5))
    async with httpx.AsyncClient(timeout=15) as client:
        for artist_name in candidates:
            result = await _random_track_from_artist(client, artist_name)
            if result:
                return result
    raise RuntimeError("Could not find a previewable Vietnamese track")


async def get_random_track_by_artists(artists: list[str]) -> dict:
    # Try DB cache first — instant if tracks are seeded
    try:
        from app.database import AsyncSessionLocal
        from app.models import Track
        from sqlalchemy import select, func as sqlfunc
        lower_names = [a.lower() for a in artists]
        async with AsyncSessionLocal() as db:
            q = select(Track).where(sqlfunc.lower(Track.artist_name).in_(lower_names))
            result = await db.execute(q)
            cached = result.scalars().all()
        if cached:
            t = random.choice(cached)
            return {
                "id": t.id,
                "title": t.title,
                "artist": t.artist_name,
                "cover_url": t.cover_url or "",
                "permalink_url": t.permalink_url or "",
            }
    except Exception:
        pass

    # Fall back to live Deezer API
    candidates = random.sample(artists, min(len(artists), 5))
    async with httpx.AsyncClient(timeout=15) as client:
        for artist_name in candidates:
            result = await _random_track_from_artist(client, artist_name)
            if result:
                return result
    raise RuntimeError(f"No previewable tracks found for selected artists")


async def get_artist_profiles(names: list[str]) -> list[dict]:
    # Check DB for already-cached avatars
    db_avatars: dict[str, str] = {}
    try:
        from app.database import AsyncSessionLocal
        from app.models import Artist
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            q = select(Artist).where(Artist.name.in_(names))
            result = await db.execute(q)
            for row in result.scalars().all():
                if row.avatar_url:
                    db_avatars[row.name] = row.avatar_url
    except Exception:
        pass

    missing = [n for n in names if n not in db_avatars]

    async def fetch_one(name: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                artist = await _find_artist(client, name)
                if not artist:
                    return {"name": name, "avatar_url": None}
                pic = artist.get("picture_medium") or artist.get("picture") or None
                # Persist to DB so next call is instant
                try:
                    from app.database import AsyncSessionLocal
                    from app.models import Artist
                    from sqlalchemy import select
                    async with AsyncSessionLocal() as db:
                        q = select(Artist).where(Artist.name == name)
                        row = (await db.execute(q)).scalar_one_or_none()
                        if row and pic:
                            row.avatar_url = pic
                            await db.commit()
                except Exception:
                    pass
                return {"name": name, "avatar_url": pic}
        except Exception:
            return {"name": name, "avatar_url": None}

    deezer_results = list(await asyncio.gather(*[fetch_one(n) for n in missing]))
    deezer_map = {r["name"]: r["avatar_url"] for r in deezer_results}

    return [
        {"name": n, "avatar_url": db_avatars.get(n) or deezer_map.get(n)}
        for n in names
    ]


async def search_tracks(q: str, limit: int = 15) -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BASE}/search", params={"q": q, "limit": limit})
        resp.raise_for_status()
        tracks = [t for t in resp.json().get("data", []) if t.get("preview")]
        return [
            {
                "id": str(t["id"]),
                "title": t["title"],
                "artist": t.get("artist", {}).get("name", ""),
            }
            for t in tracks[:limit]
        ]


async def search_tracks_by_artists(q: str, artists: list[str], limit: int = 15) -> list[dict]:
    seen: set[str] = set()
    results: list[dict] = []
    async with httpx.AsyncClient(timeout=10) as client:
        for artist in artists[:3]:
            resp = await client.get(f"{BASE}/search", params={"q": f"{q} {artist}", "limit": 30})
            if resp.status_code != 200:
                continue
            for t in resp.json().get("data", []):
                tid = str(t["id"])
                if tid not in seen and t.get("preview"):
                    seen.add(tid)
                    results.append({
                        "id": tid,
                        "title": t["title"],
                        "artist": t.get("artist", {}).get("name", ""),
                    })
    return results[:limit]


async def get_preview_url(track_id: str) -> str:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BASE}/track/{track_id}")
        resp.raise_for_status()
        url = resp.json().get("preview")
        if not url:
            raise RuntimeError(f"No preview available for Deezer track {track_id}")
        return url
