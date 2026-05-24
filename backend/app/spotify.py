import asyncio
import os
import random

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

SEARCH_QUERIES = [
    "nhạc việt", "v-pop", "nhac viet", "bolero viet", "nhac tre", "nhac vang",
    "vpop 2024", "nhạc trẻ việt nam",
]

_GENRE_QUERIES = {
    "pop":    ["vpop nhạc pop", "v-pop hit", "nhạc pop việt nam"],
    "indie":  ["indie việt nam", "indie viet nhac", "acoustic viet"],
    "hiphop": ["rap việt", "rap viet", "hip-hop viet"],
    "rock":   ["rock việt nam", "rock viet nhạc"],
}


def _client() -> spotipy.Spotify:
    return spotipy.Spotify(
        auth_manager=SpotifyClientCredentials(
            client_id=os.getenv("SPOTIFY_CLIENT_ID"),
            client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
        )
    )


def _track_fmt(t: dict) -> dict:
    images = t.get("album", {}).get("images", [])
    cover = images[0]["url"] if images else ""
    return {
        "id": t["id"],
        "title": t["name"],
        "artist": t["artists"][0]["name"] if t["artists"] else "",
        "cover_url": cover,
        "permalink_url": t.get("external_urls", {}).get("spotify", ""),
    }


def _search_sync(q: str, limit: int) -> list[dict]:
    sp = _client()
    result = sp.search(q=q, type="track", limit=limit, market="VN")
    tracks = result.get("tracks", {}).get("items", [])
    return [
        {
            "id": t["id"],
            "title": t["name"],
            "artist": t["artists"][0]["name"] if t["artists"] else "",
        }
        for t in tracks
        if t.get("preview_url")
    ]


def _random_track_sync(genre: str | None = None) -> dict:
    sp = _client()
    queries = _GENRE_QUERIES.get(genre, SEARCH_QUERIES) if genre else SEARCH_QUERIES
    q = random.choice(queries)
    result = sp.search(q=q, type="track", limit=50, market="VN")
    tracks = [
        t for t in result.get("tracks", {}).get("items", [])
        if t.get("preview_url")
    ]
    if not tracks:
        raise RuntimeError("No tracks with preview available from Spotify")
    return _track_fmt(random.choice(tracks))


def _random_track_by_artists_sync(artists: list[str]) -> dict:
    sp = _client()
    artist_name = random.choice(artists)

    result = sp.search(q=f"artist:{artist_name}", type="artist", limit=5)
    artist_items = result.get("artists", {}).get("items", [])
    if not artist_items:
        raise RuntimeError(f"No Spotify artist found for: {artist_name}")
    artist_id = artist_items[0]["id"]

    top = sp.artist_top_tracks(artist_id, country="VN")
    tracks = [t for t in top.get("tracks", []) if t.get("preview_url")]

    if not tracks:
        result2 = sp.search(q=f"artist:{artist_name}", type="track", limit=50, market="VN")
        tracks = [t for t in result2.get("tracks", {}).get("items", []) if t.get("preview_url")]

    if not tracks:
        raise RuntimeError(f"No previewable tracks found for: {artist_name}")
    return _track_fmt(random.choice(tracks))


def _get_preview_url_sync(track_id: str) -> str:
    sp = _client()
    track = sp.track(track_id)
    url = track.get("preview_url")
    if not url:
        raise RuntimeError(f"No preview available for track {track_id}")
    return url


def _get_artist_profiles_sync(names: list[str]) -> list[dict]:
    sp = _client()
    results = []
    for name in names:
        try:
            result = sp.search(q=f"artist:{name}", type="artist", limit=3)
            items = result.get("artists", {}).get("items", [])
            if items:
                a = items[0]
                images = a.get("images", [])
                results.append({
                    "name": name,
                    "avatar_url": images[0]["url"] if images else None,
                    "artist_id": a["id"],
                })
            else:
                results.append({"name": name, "avatar_url": None, "artist_id": None})
        except Exception:
            results.append({"name": name, "avatar_url": None, "artist_id": None})
    return results


def _search_tracks_by_artists_sync(q: str, artists: list[str], limit: int) -> list[dict]:
    sp = _client()
    seen: set[str] = set()
    results: list[dict] = []
    for artist in artists[:3]:
        result = sp.search(q=f"{q} artist:{artist}", type="track", limit=20, market="VN")
        for t in result.get("tracks", {}).get("items", []):
            if t["id"] not in seen:
                seen.add(t["id"])
                results.append({
                    "id": t["id"],
                    "title": t["name"],
                    "artist": t["artists"][0]["name"] if t["artists"] else "",
                })
    return results[:limit]


async def search_tracks(q: str, limit: int = 10) -> list[dict]:
    return await asyncio.to_thread(_search_sync, q, limit)


async def get_random_vietnamese_track(genre: str | None = None) -> dict:
    return await asyncio.to_thread(_random_track_sync, genre)


async def get_random_track_by_artists(artists: list[str]) -> dict:
    return await asyncio.to_thread(_random_track_by_artists_sync, artists)


async def get_preview_url(track_id: str) -> str:
    return await asyncio.to_thread(_get_preview_url_sync, track_id)


async def get_artist_profiles(names: list[str]) -> list[dict]:
    return await asyncio.to_thread(_get_artist_profiles_sync, names)


async def search_tracks_by_artists(q: str, artists: list[str], limit: int = 15) -> list[dict]:
    return await asyncio.to_thread(_search_tracks_by_artists_sync, q, artists, limit)
