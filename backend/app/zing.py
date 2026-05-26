"""
Zing MP3 provider.

get_stream_url(song_id):
  1. Direct HMAC-SHA512 API (fast, cached 5 min)
  2. Fallback to yt-dlp if direct API fails (handles key rotation)

crawl_artist_tracks(zing_url): yt-dlp flat-playlist on artist/chart URL.

Keys from yt-dlp's ZingMP3 extractor (community-maintained, updated when Zing rotates):
  API key:     X5BM3w8N7MKozC0B85o4KMlzLZKhV00y
  HMAC secret: acOrvUS15XRW2o9JksiK1KgQ6Vbds8ZW

Sig algorithm:
  sha = SHA256(sorted "key=value" pairs including ctime, no separator)
  sig = HMAC-SHA512(SECRET_KEY, api_path + sha)

Geo note: Zing stream CDN (zmdcdn.me) restricts to Vietnamese IPs.
  Railway (US region) may need VN geo-bypass — yt-dlp handles this automatically
  via its geo_bypass option; direct API cannot bypass CDN-level geo restrictions.
"""
import asyncio
import hashlib
import hmac
import logging
import time

import httpx

log = logging.getLogger(__name__)

_API_KEY = "X5BM3w8N7MKozC0B85o4KMlzLZKhV00y"
_SECRET_KEY = b"acOrvUS15XRW2o9JksiK1KgQ6Vbds8ZW"
_VERSION = "1.6.34"
_BASE = "https://zingmp3.vn/api/v2"

_REMIX_KEYWORDS = (
    "remix", "cover", "karaoke", "beat", "instrumental",
    "nightcore", "mashup", "8d audio", "speed up", "sped up",
    "slowed", "lofi", "lo-fi",
)

_stream_cache: dict[str, tuple[str, float]] = {}
_CACHE_TTL = 300  # 5 minutes


def _make_sig(path: str, params: dict) -> tuple[str, str]:
    """Return (sig, ctime). Params must NOT include ctime yet."""
    ctime = str(int(time.time()))
    all_params = {**params, "ctime": ctime}
    sha = hashlib.sha256(
        "".join(f"{k}={v}" for k, v in sorted(all_params.items())).encode()
    ).hexdigest()
    sig = hmac.new(_SECRET_KEY, f"{path}{sha}".encode(), hashlib.sha512).hexdigest()
    return sig, ctime


async def _get_stream_direct(song_id: str) -> str | None:
    """Call Zing streaming API directly. Returns None on any error."""
    path = "/song/get/streaming"
    params = {"id": song_id, "version": _VERSION}
    sig, ctime = _make_sig(path, params)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{_BASE}{path}",
                params={"id": song_id, "version": _VERSION, "ctime": ctime},
                headers={
                    "X-ZM-APPID": _API_KEY,
                    "X-ZM-SIG": sig,
                    "Referer": "https://zingmp3.vn/",
                    "Cookie": f"zmp3_device_id={song_id[:8]}",
                },
            )
        data = resp.json()
        if data.get("err") != 0:
            log.debug("[zing] API err for %s: %s", song_id, data.get("msg"))
            return None

        # Response may nest under data.streaming or directly under data
        streams = (data.get("data") or {}).get("streaming") or data.get("data") or {}
        for quality in ("320", "256", "128"):
            url = streams.get(quality) or streams.get(int(quality) if quality.isdigit() else quality)
            if url and isinstance(url, str) and url != "VIP" and url.startswith(("http", "//")):
                if url.startswith("//"):
                    url = "https:" + url
                return url

        log.debug("[zing] no free-tier stream for %s", song_id)
        return None

    except Exception as e:
        log.debug("[zing] direct API failed for %s: %s", song_id, e)
        return None


def _ytdlp_stream_sync(song_id: str) -> str | None:
    """Fallback: resolve stream URL via yt-dlp (handles key rotation automatically)."""
    try:
        import yt_dlp
    except ImportError:
        return None

    # yt-dlp ZingMP3 extractor accepts: /bai-hat/{slug}/{ID}.html
    # The slug is arbitrary — yt-dlp looks at the ID at the end.
    url = f"https://zingmp3.vn/bai-hat/x/{song_id}.html"
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "ignoreerrors": True,
        "format": "bestaudio/best",
        "geo_bypass": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
        if not info:
            return None
        if info.get("url"):
            return info["url"]
        for f in sorted(info.get("formats", []), key=lambda x: x.get("abr") or 0, reverse=True):
            if f.get("url") and f.get("acodec") not in (None, "none"):
                return f["url"]
        return None
    except Exception as e:
        log.warning("[zing] yt-dlp fallback failed for %s: %s", song_id, e)
        return None


async def get_stream_url(song_id: str) -> str | None:
    """Get a streamable audio URL, with 5-minute cache. Tries direct API first, then yt-dlp."""
    now = time.monotonic()
    if song_id in _stream_cache:
        url, ts = _stream_cache[song_id]
        if now - ts < _CACHE_TTL:
            return url

    url = await _get_stream_direct(song_id)
    if not url:
        log.info("[zing] direct API miss for %s — trying yt-dlp fallback", song_id)
        url = await asyncio.to_thread(_ytdlp_stream_sync, song_id)

    if url:
        _stream_cache[song_id] = (url, now)
    return url


def _is_song(title: str) -> bool:
    t = title.lower()
    return not any(kw in t for kw in _REMIX_KEYWORDS)


def _crawl_sync(zing_url: str, limit: int) -> list[dict]:
    try:
        import yt_dlp
    except ImportError:
        log.error("[zing] yt-dlp not installed")
        return []

    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "playlistend": limit,
        "ignoreerrors": True,
        "geo_bypass": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(zing_url, download=False)
    except Exception as e:
        log.warning("[zing] yt-dlp crawl failed for %s: %s", zing_url, e)
        return []

    if not info:
        return []

    entries = info.get("entries") or ([info] if info.get("id") else [])
    out = []
    for e in entries:
        if not e:
            continue
        zing_id = e.get("id") or ""
        title = e.get("title") or ""
        if not zing_id or not title:
            continue
        if not _is_song(title):
            continue
        duration = e.get("duration") or 0
        if duration >= 600:
            continue
        webpage_url = e.get("webpage_url") or e.get("url") or ""
        out.append({
            "source": "zing",
            "source_id": zing_id,
            "title": title,
            "artist": e.get("uploader") or e.get("artist") or "",
            "cover_url": e.get("thumbnail"),
            "permalink_url": webpage_url,
            "duration_ms": int(duration * 1000),
        })
    return out


async def crawl_artist_tracks(zing_url: str, limit: int = 300) -> list[dict]:
    """Crawl metadata from a Zing artist page or chart URL via yt-dlp."""
    return await asyncio.to_thread(_crawl_sync, zing_url, limit)


async def get_chart_tracks(limit: int = 100) -> list[dict]:
    """Return current Zing V-Pop top chart."""
    return await crawl_artist_tracks("https://zingmp3.vn/zing-chart", limit=limit)
