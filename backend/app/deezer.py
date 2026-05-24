import asyncio
import random
import httpx

BASE = "https://api.deezer.com"

SEARCH_QUERIES = [
    "nhạc việt", "vpop", "nhac viet", "bolero viet", "nhac tre", "nhac vang",
    "vpop 2024", "nhạc trẻ việt nam",
]

_GENRE_QUERIES = {
    "pop":    ["vpop nhạc pop", "v-pop hit việt", "nhạc pop việt nam"],
    "indie":  ["indie việt nam", "indie viet", "acoustic viet"],
    "hiphop": ["rap việt", "rap viet", "hip-hop viet"],
    "rock":   ["rock việt nam", "rock viet"],
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
    resp = await client.get(f"{BASE}/search/artist", params={"q": name, "limit": 5})
    if resp.status_code != 200:
        return None
    items = resp.json().get("data", [])
    return items[0] if items else None


async def get_random_vietnamese_track(genre: str | None = None) -> dict:
    queries = _GENRE_QUERIES.get(genre, SEARCH_QUERIES) if genre else SEARCH_QUERIES
    q = random.choice(queries)
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BASE}/search", params={"q": q, "limit": 50})
        resp.raise_for_status()
        tracks = [t for t in resp.json().get("data", []) if t.get("preview")]
        if not tracks:
            raise RuntimeError("No eligible tracks found from Deezer")
        return _track_fmt(random.choice(tracks))


async def get_random_track_by_artists(artists: list[str]) -> dict:
    artist_name = random.choice(artists)
    async with httpx.AsyncClient(timeout=15) as client:
        artist = await _find_artist(client, artist_name)
        if not artist:
            raise RuntimeError(f"No Deezer artist found for: {artist_name}")

        resp = await client.get(f"{BASE}/artist/{artist['id']}/top", params={"limit": 50})
        resp.raise_for_status()
        tracks = [t for t in resp.json().get("data", []) if t.get("preview")]

        if not tracks:
            resp2 = await client.get(f"{BASE}/search", params={"q": artist_name, "limit": 50})
            resp2.raise_for_status()
            tracks = [t for t in resp2.json().get("data", []) if t.get("preview")]

        if not tracks:
            raise RuntimeError(f"No previewable tracks found for: {artist_name}")

        return _track_fmt(random.choice(tracks), artist_override=artist)


async def get_artist_profiles(names: list[str]) -> list[dict]:
    async def fetch_one(name: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                artist = await _find_artist(client, name)
                if not artist:
                    return {"name": name, "avatar_url": None}
                pic = artist.get("picture_medium") or artist.get("picture") or None
                return {"name": name, "avatar_url": pic}
        except Exception:
            return {"name": name, "avatar_url": None}

    return list(await asyncio.gather(*[fetch_one(n) for n in names]))


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
