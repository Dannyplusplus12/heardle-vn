from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.routers.search import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

MOCK_RESULTS = [
    {"id": "111", "title": "Bài Hát A", "artist": "Ca Sĩ A"},
    {"id": "222", "title": "Bài Hát B", "artist": "Ca Sĩ B"},
]


def test_search_returns_results():
    with patch("app.routers.search.search_tracks", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_RESULTS
        resp = client.get("/api/search?q=nhac+viet")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
    assert resp.json()[0]["title"] == "Bài Hát A"


def test_search_requires_query():
    resp = client.get("/api/search")
    assert resp.status_code == 422


def test_search_handles_soundcloud_error():
    with patch("app.routers.search.search_tracks", new_callable=AsyncMock) as mock:
        mock.side_effect = RuntimeError("API down")
        resp = client.get("/api/search?q=test")
    assert resp.status_code == 502
