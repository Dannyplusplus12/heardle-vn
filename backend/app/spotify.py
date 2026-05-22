import asyncio
import os
import random

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

SEARCH_QUERIES = [
    "nhạc việt", "v-pop", "nhac viet", "bolero viet", "nhac tre", "nhac vang",
    "vpop 2024", "nhạc trẻ việt nam",
]


def _client() -> spotipy.Spotify:
    return spotipy.Spotify(
        auth_manager=SpotifyClientCredentials(
            client_id=os.getenv("SPOTIFY_CLIENT_ID"),
            client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
        )
    )


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


def _random_track_sync() -> dict:
    sp = _client()
    q = random.choice(SEARCH_QUERIES)
    result = sp.search(q=q, type="track", limit=50, market="VN")
    tracks = [
        t for t in result.get("tracks", {}).get("items", [])
        if t.get("preview_url")
    ]
    if not tracks:
        raise RuntimeError("No tracks with preview available from Spotify")
    t = random.choice(tracks)
    images = t.get("album", {}).get("images", [])
    cover = images[0]["url"] if images else ""
    return {
        "id": t["id"],
        "title": t["name"],
        "artist": t["artists"][0]["name"] if t["artists"] else "",
        "cover_url": cover,
    }


def _get_preview_url_sync(track_id: str) -> str:
    sp = _client()
    track = sp.track(track_id)
    url = track.get("preview_url")
    if not url:
        raise RuntimeError(f"No preview available for track {track_id}")
    return url


async def search_tracks(q: str, limit: int = 10) -> list[dict]:
    return await asyncio.to_thread(_search_sync, q, limit)


async def get_random_vietnamese_track() -> dict:
    return await asyncio.to_thread(_random_track_sync)


async def get_preview_url(track_id: str) -> str:
    return await asyncio.to_thread(_get_preview_url_sync, track_id)
