import httpx
import random
import os

CLIENT_ID = os.getenv("SOUNDCLOUD_CLIENT_ID", "")
BASE = "https://api-v2.soundcloud.com"

SEARCH_QUERIES = [
    "nhac viet", "v-pop", "nhạc Việt", "nhac tre", "bolero viet", "nhac vang"
]


async def search_tracks(q: str, limit: int = 10) -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE}/search/tracks",
            params={"q": q, "limit": limit, "client_id": CLIENT_ID},
        )
        resp.raise_for_status()
        return [
            {
                "id": str(t["id"]),
                "title": t["title"],
                "artist": t["user"]["username"],
            }
            for t in resp.json().get("collection", [])
        ]


async def get_random_vietnamese_track() -> dict:
    q = random.choice(SEARCH_QUERIES)
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE}/search/tracks",
            params={"q": q, "limit": 50, "client_id": CLIENT_ID},
        )
        resp.raise_for_status()
        tracks = resp.json().get("collection", [])
        if not tracks:
            raise RuntimeError("No tracks found from SoundCloud")
        t = random.choice(tracks)
        return {
            "id": str(t["id"]),
            "title": t["title"],
            "artist": t["user"]["username"],
            "cover_url": t.get("artwork_url") or t["user"].get("avatar_url", ""),
        }


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
