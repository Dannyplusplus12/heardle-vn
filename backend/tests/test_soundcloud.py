import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.soundcloud import search_tracks, get_random_vietnamese_track, get_stream_url


MOCK_TRACK = {
    "id": 123456,
    "title": "Bài Hát Test",
    "user": {"username": "Ca Sĩ Test", "avatar_url": "http://img.test/avatar.jpg"},
    "artwork_url": "http://img.test/art.jpg",
    "media": {
        "transcodings": [
            {
                "url": "https://api-v2.soundcloud.com/media/123/stream",
                "format": {"protocol": "progressive", "mime_type": "audio/mpeg"},
            }
        ]
    },
}


def make_mock_response(json_data, status=200):
    mock = AsyncMock()
    mock.status_code = status
    mock.json = MagicMock(return_value=json_data)
    mock.raise_for_status = MagicMock()
    return mock


@pytest.mark.asyncio
async def test_search_tracks_returns_formatted_list():
    mock_resp = make_mock_response({"collection": [MOCK_TRACK]})
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_resp)

    with patch("app.soundcloud.httpx.AsyncClient", return_value=mock_client):
        result = await search_tracks("nhac viet", limit=1)

    assert result == [{"id": "123456", "title": "Bài Hát Test", "artist": "Ca Sĩ Test"}]


@pytest.mark.asyncio
async def test_get_random_vietnamese_track_returns_track():
    mock_resp = make_mock_response({"collection": [MOCK_TRACK]})
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_resp)

    with patch("app.soundcloud.httpx.AsyncClient", return_value=mock_client):
        result = await get_random_vietnamese_track()

    assert result["id"] == "123456"
    assert result["title"] == "Bài Hát Test"
    assert result["artist"] == "Ca Sĩ Test"
    assert result["cover_url"] == "http://img.test/art.jpg"


@pytest.mark.asyncio
async def test_get_stream_url_resolves_progressive():
    track_resp = make_mock_response(MOCK_TRACK)
    stream_resp = make_mock_response({"url": "https://cf-media.sndcdn.com/stream.mp3"})
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(side_effect=[track_resp, stream_resp])

    with patch("app.soundcloud.httpx.AsyncClient", return_value=mock_client):
        url = await get_stream_url("123456")

    assert url == "https://cf-media.sndcdn.com/stream.mp3"
