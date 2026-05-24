"""
Background seeder — runs at startup if the tracks table is mostly empty.
Fetches Deezer top tracks + artist avatars for all artists in the DB,
falling back to the hardcoded artist list if the DB is fresh.
"""
import asyncio
import logging

import httpx

log = logging.getLogger(__name__)

# Mirrors the fallback list in routers/artists.py — used when DB is empty
_SEED_ARTISTS = [
    "Son Tung MTP", "HIEUTHUHAI", "Den Vau", "Hoa Minzy", "SOOBIN",
    "JustaTee", "Bui Truong Linh", "Vu.", "Jack J97", "MIN",
    "RPT MCK", "Obito", "Mr Siro", "Quan A.P", "Chau Khai Phong",
    "Duc Phuc", "Low G", "ACV", "Phung Khanh Linh", "Erik",
    "Quang Hung MasterD", "Duong Domic", "tlinh", "My Tam", "Le Bao Binh",
    "AMEE", "Phuong Ly", "Bich Phuong", "Phan Manh Quynh", "Huong Giang",
    "Noo Phuoc Thinh", "Phuong My Chi", "Van Mai Huong", "Wxrdie", "Da LAB",
    "Bao Anh", "Masew", "Karik", "Thanh Hung", "MONSTAR",
    "Quang Anh Rhyder", "Hoang Dung", "Ngo Lan Huong", "Ha Anh Tuan", "Negav",
    "Lam Chan Khang", "Vu Cat Tuong", "B Ray", "Ngo Kien Huy", "Hoang Thuy Linh",
    "Truc Nhan", "Dat G", "Dam Vinh Hung", "Orange", "Toc Tien",
    "Ngot", "Quoc Thien", "Juky San", "Ho Quang Hieu", "Hien Ho",
    "Rhymastic", "Ho Viet Trung", "LyLy", "Tuan Hung", "Chillies",
    "Hoai Lam", "Dong Nhi", "Lou Hoang", "Phao", "Tang Duy Tan",
    "Miu Le", "Han Sara", "Only C", "Ho Ngoc Ha", "DatKaa",
    "Dinh Dung", "MONO", "Anh Tu Atus", "Thuy Chi", "GREY D",
    "Wren Evans", "Andree Right Hand", "Isaac", "Trung Quan", "HURRYKNG",
    "Thinh Suy", "Thieu Bao Tram", "Hoang Ton", "Binh Gold", "Trinh Thang Binh",
    "Minh Hang", "BigDaddy", "The Men", "Dan Truong", "Bui Anh Tuan",
    "Tang Phuc", "Jun Pham", "Bui Cong Nam", "Duy Manh", "Chi Dan",
    "Gin Tuan Kiet", "Wowy", "Huong Tram", "Suboi", "Kai Dinh",
    "Suni Ha Linh", "Cam Ly", "Le Quyen", "Tien Tien", "Nguyen Tran Trung Quan",
    "Thuy Tien", "HuyR", "Osad", "De Choat", "Le Thien Hieu",
    "My Linh", "Nguyen Dinh Vu", "Lynk Lee", "Khac Viet", "Lam Truong",
    "Song Luan", "Hua Kim Tuyen", "Bao Thy", "Tuan Vu", "Nhu Quynh",
    "Quang Ha", "Minh Tuyet", "Yen Trang", "Phi Phuong Anh", "Thanh Thao",
    "Ho Quynh Huong", "Uyen Linh", "Lam Chan Huy", "Gill", "Seachains",
    "Kimmese", "Cukak", "Khoi My", "Luu Huong Giang", "Quang Le",
    "Trang Phap", "Hannie", "Trung Kien", "Ho Van Cuong", "Cara",
    "Thai Trinh", "Vo Ha Tram", "Uni5", "Mlee", "SOL7",
]

BASE = "https://api.deezer.com"


async def _fetch_artist_data(client: httpx.AsyncClient, name: str) -> dict | None:
    try:
        resp = await client.get(f"{BASE}/search/artist", params={"q": name, "limit": 3})
        if resp.status_code != 200:
            return None
        items = resp.json().get("data", [])
        return items[0] if items else None
    except Exception:
        return None


async def _fetch_top_tracks(client: httpx.AsyncClient, artist_id: int) -> list[dict]:
    try:
        resp = await client.get(f"{BASE}/artist/{artist_id}/top", params={"limit": 50})
        if resp.status_code != 200:
            return []
        return [t for t in resp.json().get("data", []) if t.get("preview")]
    except Exception:
        return []


async def seed_if_empty():
    await asyncio.sleep(5)  # Give the DB a moment to fully initialize

    try:
        from app.database import AsyncSessionLocal
        from app.models import Artist, Track
        from sqlalchemy import select, func
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        async with AsyncSessionLocal() as db:
            track_count = (await db.execute(select(func.count()).select_from(Track))).scalar()

        if track_count and track_count >= 50:
            log.info("[seeder] tracks table already seeded (%d rows), skipping", track_count)
            return

        log.info("[seeder] tracks table is empty — starting background seed")

        # Collect artist names from DB, fall back to hardcoded list
        try:
            async with AsyncSessionLocal() as db:
                rows = (await db.execute(select(Artist).order_by(Artist.rank))).scalars().all()
            names = [r.name for r in rows] if rows else _SEED_ARTISTS
        except Exception:
            names = _SEED_ARTISTS

        log.info("[seeder] will seed %d artists", len(names))

        async with httpx.AsyncClient(timeout=15) as client:
            for i, name in enumerate(names):
                try:
                    artist = await _fetch_artist_data(client, name)
                    if not artist:
                        continue

                    avatar = artist.get("picture_medium") or artist.get("picture")
                    tracks = await _fetch_top_tracks(client, artist["id"])

                    async with AsyncSessionLocal() as db:
                        # Upsert avatar on artist row
                        if avatar:
                            q = select(Artist).where(Artist.name == name)
                            row = (await db.execute(q)).scalar_one_or_none()
                            if row and not row.avatar_url:
                                row.avatar_url = avatar

                        # Upsert tracks
                        if tracks:
                            album = tracks[0].get("album", {})
                            stmt = pg_insert(Track).values([
                                {
                                    "id": str(t["id"]),
                                    "title": t["title"],
                                    "artist_name": name,
                                    "cover_url": t.get("album", {}).get("cover_medium")
                                               or artist.get("picture_medium"),
                                    "permalink_url": t.get("link"),
                                }
                                for t in tracks
                            ]).on_conflict_do_nothing(index_elements=["id"])
                            await db.execute(stmt)

                        await db.commit()

                    log.info("[seeder] (%d/%d) %s — %d tracks", i + 1, len(names), name, len(tracks))
                except Exception as e:
                    log.warning("[seeder] skipped %s: %s", name, e)

                # Polite delay between artists — avoid hammering Deezer
                await asyncio.sleep(0.4)

        log.info("[seeder] finished seeding tracks table")

    except Exception as e:
        log.error("[seeder] failed: %s", e)
