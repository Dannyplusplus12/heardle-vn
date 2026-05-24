import asyncio
import httpx
import random
import os
import unicodedata

CLIENT_ID = os.getenv("SOUNDCLOUD_CLIENT_ID", "")
BASE = "https://api-v2.soundcloud.com"

_DEFAULT_QUERIES = [
    "nhac viet", "v-pop", "nhạc Việt", "nhac tre", "bolero viet", "nhac vang"
]

_GENRE_QUERIES = {
    "pop":    ["vpop", "v-pop", "nhạc pop việt", "nhac pop viet"],
    "indie":  ["indie việt", "indie viet", "nhạc indie viet"],
    "hiphop": ["rap việt", "rap viet", "nhạc rap", "hip-hop viet"],
    "rock":   ["rock việt", "rock viet", "nhạc rock viet"],
}

_REMIX_KEYWORDS = {
    "remix", "cover", "karaoke", "beat", "instrumental", "acoustic",
    "nightcore", "nhạc nền", "mashup", "medley", "lo-fi", "lofi",
}

_MIN_PLAYS = 50_000


def _strip_diacritics(text: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    ).lower().strip()


_MAX_DURATION_MS = 7 * 60 * 1000  # 7 minutes


def _is_eligible(track: dict) -> bool:
    title = track.get("title", "").lower()
    if any(kw in title for kw in _REMIX_KEYWORDS):
        return False
    if track.get("playback_count", 0) < _MIN_PLAYS:
        return False
    if track.get("duration", 0) > _MAX_DURATION_MS:
        return False
    return True


def _no_remix(track: dict) -> bool:
    title = track.get("title", "").lower()
    return not any(kw in title for kw in _REMIX_KEYWORDS)


def _fmt(t: dict) -> dict:
    return {
        "id": str(t["id"]),
        "title": t["title"],
        "artist": t["user"]["username"],
    }


async def search_tracks(q: str, limit: int = 15) -> list[dict]:
    stripped = _strip_diacritics(q)
    queries = [q] if stripped == q.lower() else [q, stripped]

    seen: set[int] = set()
    results: list[dict] = []

    async with httpx.AsyncClient(timeout=10) as client:
        for search_q in queries:
            resp = await client.get(
                f"{BASE}/search/tracks",
                params={"q": search_q, "limit": 50, "client_id": CLIENT_ID},
            )
            if resp.status_code != 200:
                continue
            for t in resp.json().get("collection", []):
                if t["id"] not in seen and _is_eligible(t):
                    seen.add(t["id"])
                    results.append(t)

    return [_fmt(t) for t in results[:limit]]


async def get_random_vietnamese_track(genre: str | None = None) -> dict:
    queries = _GENRE_QUERIES.get(genre, _DEFAULT_QUERIES) if genre else _DEFAULT_QUERIES
    q = random.choice(queries)
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE}/search/tracks",
            params={"q": q, "limit": 50, "client_id": CLIENT_ID},
        )
        resp.raise_for_status()
        tracks = [t for t in resp.json().get("collection", []) if _is_eligible(t)]
        if not tracks:
            raise RuntimeError("No eligible tracks found from SoundCloud")
        t = random.choice(tracks)
        return {
            "id": str(t["id"]),
            "title": t["title"],
            "artist": t["user"]["username"],
            "cover_url": t.get("artwork_url") or t["user"].get("avatar_url", ""),
            "permalink_url": t.get("permalink_url", ""),
        }


async def _find_user(client: httpx.AsyncClient, name: str) -> dict | None:
    resp = await client.get(
        f"{BASE}/search/users",
        params={"q": name, "limit": 3, "client_id": CLIENT_ID},
    )
    if resp.status_code != 200:
        return None
    users = resp.json().get("collection", [])
    return users[0] if users else None


async def get_random_track_by_artists(artists: list[str]) -> dict:
    artist_name = random.choice(artists)
    async with httpx.AsyncClient(timeout=15) as client:
        user = await _find_user(client, artist_name)
        if not user:
            raise RuntimeError(f"No SoundCloud user found for: {artist_name}")
        user_id = user["id"]

        resp = await client.get(
            f"{BASE}/users/{user_id}/tracks",
            params={"client_id": CLIENT_ID, "limit": 50},
        )
        resp.raise_for_status()
        tracks = resp.json().get("collection", [])
        if not tracks:
            raise RuntimeError(f"No tracks on account for: {artist_name}")

        t = random.choice(tracks)
        return {
            "id": str(t["id"]),
            "title": t["title"],
            "artist": t.get("user", {}).get("username", artist_name),
            "cover_url": t.get("artwork_url") or user.get("avatar_url", ""),
            "permalink_url": t.get("permalink_url", ""),
        }


async def get_artist_profiles(names: list[str]) -> list[dict]:
    async def fetch_one(name: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                user = await _find_user(client, name)
                if not user:
                    return {"name": name, "avatar_url": None, "user_id": None}
                avatar = user.get("avatar_url") or ""
                if avatar:
                    avatar = avatar.replace("-large.", "-t300x300.")
                return {"name": name, "avatar_url": avatar, "user_id": str(user["id"])}
        except Exception:
            return {"name": name, "avatar_url": None, "user_id": None}

    return list(await asyncio.gather(*[fetch_one(n) for n in names]))


async def search_tracks_by_artists(q: str, artists: list[str], limit: int = 15) -> list[dict]:
    seen: set[int] = set()
    results: list[dict] = []
    async with httpx.AsyncClient(timeout=10) as client:
        for artist in artists[:3]:
            resp = await client.get(
                f"{BASE}/search/tracks",
                params={"q": f"{q} {artist}", "limit": 30, "client_id": CLIENT_ID},
            )
            if resp.status_code != 200:
                continue
            for t in resp.json().get("collection", []):
                if t["id"] not in seen:
                    seen.add(t["id"])
                    results.append(t)
    return [_fmt(t) for t in results[:limit]]


async def _resolve_user(client: httpx.AsyncClient, name_or_url: str) -> dict | None:
    """Resolve a SoundCloud user from a profile URL or by name search."""
    if "soundcloud.com" in name_or_url:
        try:
            resp = await client.get(
                f"{BASE}/resolve",
                params={"url": name_or_url, "client_id": CLIENT_ID},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("kind") == "user":
                    return data
        except Exception:
            pass
    return await _find_user(client, name_or_url)


async def get_artist_tracks(name_or_url: str, limit: int = 50) -> list[dict]:
    """Return an artist's own SoundCloud uploads in normalized form (no remixes)."""
    if not CLIENT_ID:
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            user = await _resolve_user(client, name_or_url)
            if not user:
                return []
            resp = await client.get(
                f"{BASE}/users/{user['id']}/tracks",
                params={"client_id": CLIENT_ID, "limit": limit},
            )
            if resp.status_code != 200:
                return []
            avatar = user.get("avatar_url") or ""
            out = []
            for t in resp.json().get("collection", []):
                if not _no_remix(t):
                    continue
                if t.get("duration", 0) > _MAX_DURATION_MS:
                    continue
                out.append({
                    "source": "soundcloud",
                    "source_id": str(t["id"]),
                    "title": t["title"],
                    "artist": t.get("user", {}).get("username", ""),
                    "cover_url": t.get("artwork_url") or avatar or None,
                    "permalink_url": t.get("permalink_url"),
                })
            return out
    except Exception:
        return []


async def get_artist_avatar(name_or_url: str) -> str | None:
    if not CLIENT_ID:
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            user = await _resolve_user(client, name_or_url)
            if not user:
                return None
            avatar = user.get("avatar_url") or ""
            return avatar.replace("-large.", "-t300x300.") if avatar else None
    except Exception:
        return None


async def get_stream_url(track_id: str) -> str:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE}/tracks/{track_id}",
            params={"client_id": CLIENT_ID},
        )
        resp.raise_for_status()
        track = resp.json()

        transcodings = track.get("media", {}).get("transcodings", [])
        url = None
        for t in transcodings:
            if t["format"]["protocol"] == "progressive":
                url = t["url"]
                break
        if not url:
            for t in transcodings:
                if t["format"]["protocol"] == "hls":
                    url = t["url"]
                    break
        if not url:
            raise RuntimeError(f"No streamable transcoding for track {track_id}")

        resp2 = await client.get(url, params={"client_id": CLIENT_ID})
        resp2.raise_for_status()
        return resp2.json()["url"]
