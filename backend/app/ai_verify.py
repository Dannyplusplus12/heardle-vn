"""
AI-assisted artist resolution. Called ONLY when Deezer fails to give enough
songs (0 or <=10) or no image. Uses the Anthropic API with web search to
locate the artist's real SoundCloud profile and YouTube channel.

No-ops gracefully (returns {}) when ANTHROPIC_API_KEY is unset, so the rest
of the pipeline keeps working without AI.
"""
import json
import logging
import os
import re

log = logging.getLogger(__name__)

_client = None
_disabled = False


def _get_client():
    global _client, _disabled
    if _disabled:
        return None
    if _client is not None:
        return _client
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        _disabled = True
        log.info("[ai_verify] ANTHROPIC_API_KEY not set — AI verification disabled")
        return None
    try:
        from anthropic import AsyncAnthropic
        _client = AsyncAnthropic(api_key=key)
        return _client
    except Exception as e:
        log.warning("[ai_verify] could not init Anthropic client: %s", e)
        _disabled = True
        return None


def _extract_json(text: str) -> dict:
    """Pull the last JSON object out of Claude's reply."""
    matches = re.findall(r"\{[^{}]*\}", text, re.DOTALL)
    for m in reversed(matches):
        try:
            return json.loads(m)
        except Exception:
            continue
    return {}


async def find_artist_sources(name: str) -> dict:
    """
    Returns a dict like:
      {
        "is_vietnamese_artist": true,
        "canonical_name": "Đen Vâu",
        "soundcloud_url": "https://soundcloud.com/...",  # or None
        "youtube_url": "https://www.youtube.com/@..."     # or None
      }
    Empty dict if AI is disabled or the call fails.
    """
    client = _get_client()
    if client is None:
        return {}

    prompt = (
        f'Find the official music profiles for the Vietnamese music artist "{name}". '
        "Use web search. I specifically need their SoundCloud profile URL and their "
        "official YouTube channel URL (an artist/official channel or a YouTube 'Topic' "
        "channel — not a random fan upload).\n\n"
        "Respond with ONLY a single JSON object, no prose, in this exact shape:\n"
        '{"is_vietnamese_artist": true, "canonical_name": "...", '
        '"soundcloud_url": "https://soundcloud.com/... or null", '
        '"youtube_url": "https://www.youtube.com/... or null"}\n'
        "Use null (not a guess) when you cannot find a reliable profile."
    )

    try:
        resp = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(
            block.text for block in resp.content if getattr(block, "type", "") == "text"
        )
        data = _extract_json(text)
        if not data:
            log.warning("[ai_verify] no JSON parsed for %s", name)
            return {}
        # Normalize null strings
        for k in ("soundcloud_url", "youtube_url", "canonical_name"):
            v = data.get(k)
            if isinstance(v, str) and v.strip().lower() in ("null", "none", ""):
                data[k] = None
        return data
    except Exception as e:
        log.warning("[ai_verify] lookup failed for %s: %s", name, e)
        return {}
