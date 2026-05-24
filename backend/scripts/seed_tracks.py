#!/usr/bin/env python3
"""
Seed artist avatars and top tracks from Deezer into the database.

Usage:
    cd backend
    python scripts/seed_tracks.py              # seed all artists in DB (or fallback list)
    python scripts/seed_tracks.py --limit 20   # only seed first 20 artists
    python scripts/seed_tracks.py --dry-run    # print what would be seeded, no DB writes

Run after crawl_viberate.py so the artists table is populated first.
Can also be run standalone — falls back to the hardcoded artist list.
"""
import asyncio
import sys
import os
import argparse

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import httpx

BASE = "https://api.deezer.com"

_FALLBACK_ARTISTS = [
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


async def fetch_artist(client: httpx.AsyncClient, name: str) -> dict | None:
    resp = await client.get(f"{BASE}/search/artist", params={"q": name, "limit": 3})
    if resp.status_code != 200:
        return None
    items = resp.json().get("data", [])
    return items[0] if items else None


async def fetch_tracks(client: httpx.AsyncClient, artist_id: int) -> list[dict]:
    resp = await client.get(f"{BASE}/artist/{artist_id}/top", params={"limit": 50})
    if resp.status_code != 200:
        return []
    return [t for t in resp.json().get("data", []) if t.get("preview")]


async def get_artist_names() -> list[str]:
    try:
        from app.database import AsyncSessionLocal
        from app.models import Artist
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            rows = (await db.execute(select(Artist).order_by(Artist.rank))).scalars().all()
        if rows:
            print(f"Using {len(rows)} artists from database.")
            return [r.name for r in rows]
    except Exception as e:
        print(f"DB unavailable ({e}), using fallback list.")
    return _FALLBACK_ARTISTS


async def seed(names: list[str], dry_run: bool):
    from app.database import AsyncSessionLocal
    from app.models import Artist, Track
    from sqlalchemy import select
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    total_tracks = 0
    total_avatars = 0

    async with httpx.AsyncClient(timeout=15) as client:
        for i, name in enumerate(names):
            try:
                artist = await fetch_artist(client, name)
                if not artist:
                    print(f"  [{i+1}/{len(names)}] {name}: not found on Deezer")
                    continue

                avatar = artist.get("picture_medium") or artist.get("picture")
                tracks = await fetch_tracks(client, artist["id"])

                print(f"  [{i+1}/{len(names)}] {name}: {len(tracks)} tracks, avatar={'yes' if avatar else 'no'}")

                if dry_run:
                    await asyncio.sleep(0.3)
                    continue

                async with AsyncSessionLocal() as db:
                    # Update artist avatar
                    row = (await db.execute(select(Artist).where(Artist.name == name))).scalar_one_or_none()
                    if row and avatar and not row.avatar_url:
                        row.avatar_url = avatar
                        total_avatars += 1

                    # Upsert tracks
                    if tracks:
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
                        total_tracks += len(tracks)

                    await db.commit()

            except Exception as e:
                print(f"  [{i+1}/{len(names)}] {name}: ERROR — {e}")

            await asyncio.sleep(0.4)

    if not dry_run:
        print(f"\nDone. Seeded {total_tracks} tracks, updated {total_avatars} avatars.")
    else:
        print(f"\nDry run complete — no DB writes.")


async def main():
    parser = argparse.ArgumentParser(description="Seed Deezer tracks and avatars into DB")
    parser.add_argument("--limit", type=int, default=None, help="Max artists to process")
    parser.add_argument("--dry-run", action="store_true", help="Print only, no DB writes")
    args = parser.parse_args()

    names = await get_artist_names()
    if args.limit:
        names = names[:args.limit]

    print(f"Seeding {len(names)} artists {'(dry run)' if args.dry_run else 'into DB'}...")
    await seed(names, dry_run=args.dry_run)


if __name__ == "__main__":
    asyncio.run(main())
