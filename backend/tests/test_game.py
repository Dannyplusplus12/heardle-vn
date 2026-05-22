from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.routers.game import router

app = FastAPI()
app.include_router(router)

@app.get("/api/health")
async def health():
    return {"status": "ok"}

client = TestClient(app)

MOCK_TRACK = {
    "id": "123456",
    "title": "Bài Hát Test",
    "artist": "Ca Sĩ Test",
    "cover_url": "http://img.test/art.jpg",
}


def test_new_game_returns_track():
    with patch("app.routers.game.get_random_vietnamese_track", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_TRACK
        resp = client.get("/api/game/new")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "123456"
    assert data["title"] == "Bài Hát Test"


def test_new_game_handles_soundcloud_error():
    with patch("app.routers.game.get_random_vietnamese_track", new_callable=AsyncMock) as mock:
        mock.side_effect = RuntimeError("API down")
        resp = client.get("/api/game/new")
    assert resp.status_code == 502


def test_clip_invalid_duration():
    resp = client.get("/api/game/clip/123456?duration=7")
    assert resp.status_code == 400


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
