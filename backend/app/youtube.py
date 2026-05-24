"""
YouTube provider via yt-dlp. Last-resort audio source.

- search_artist_tracks(): finds an artist's songs (from a channel URL or a name search)
- get_stream_url(): resolves a fresh audio stream URL on demand (URLs expire, so we
  never store them — the clip endpoint calls this at play time)

NOTE: YouTube aggressively blocks datacenter IPs. yt-dlp may fail on Railway with
"Sign in to confirm you're not a bot". All functions fail soft (return [] / None)
so the pipeline falls through to skipping the artist rather than crashing.
"""
import asyncio
import logging
import re

log = logging.getLogger(__name__)

_REMIX_KEYWORDS = (
    "remix", "cover", "karaoke", "beat", "instrumental", "lyrics video",
    "lyric video", "reaction", "live", "mv reaction", "nightcore", "mashup",
    "8d audio", "speed up", "sped up", "slowed",
)

_BASE_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "noplaylist": True,
    "ignoreerrors": True,
    "geo_bypass": True,
}


def _is_song(title: str) -> bool:
    t = title.lower()
    return not any(kw in t for kw in _REMIX_KEYWORDS)


def _normalize(entry: dict) -> dict | None:
    vid = entry.get("id")
    title = entry.get("title")
    if not vid or not title or not _is_song(title):
        return None
    if entry.get("duration", 0) >= 600:  # skip >= 10 minutes (vlogs, full albums)
        return None
    return {
        "source": "youtube",
        "source_id": vid,
        "title": title,
        "artist": entry.get("uploader") or entry.get("channel") or "",
        "cover_url": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
        "permalink_url": f"https://www.youtube.com/watch?v={vid}",
    }


def _search_sync(name_or_url: str, limit: int) -> list[dict]:
    try:
        import yt_dlp
    except Exception:
        log.warning("[youtube] yt-dlp not installed")
        return []

    is_channel = bool(re.search(r"youtube\.com|youtu\.be", name_or_url or ""))
    if is_channel:
        target = name_or_url.rstrip("/")
        if not target.endswith("/videos") and "/watch" not in target:
            target = target + "/videos"
        query = target
    else:
        query = f"ytsearch{limit}:{name_or_url} official audio"

    opts = {**_BASE_OPTS, "extract_flat": "in_playlist", "playlistend": limit}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(query, download=False)
    except Exception as e:
        log.warning("[youtube] search failed for %s: %s", name_or_url, e)
        return []

    if not info:
        return []
    entries = info.get("entries") or ([info] if info.get("id") else [])
    out = []
    for e in entries:
        if not e:
            continue
        norm = _normalize(e)
        if norm:
            out.append(norm)
    return out[:limit]


def _stream_url_sync(video_id: str) -> str | None:
    try:
        import yt_dlp
    except Exception:
        return None
    opts = {**_BASE_OPTS, "format": "bestaudio/best"}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}", download=False
            )
        if not info:
            return None
        if info.get("url"):
            return info["url"]
        # Fall back to scanning formats for an audio-only stream
        for f in info.get("formats", []):
            if f.get("acodec") not in (None, "none") and f.get("vcodec") in (None, "none"):
                if f.get("url"):
                    return f["url"]
        return None
    except Exception as e:
        log.warning("[youtube] stream resolve failed for %s: %s", video_id, e)
        return None


async def search_artist_tracks(name_or_url: str, limit: int = 25) -> list[dict]:
    return await asyncio.to_thread(_search_sync, name_or_url, limit)


async def get_stream_url(video_id: str) -> str | None:
    return await asyncio.to_thread(_stream_url_sync, video_id)
