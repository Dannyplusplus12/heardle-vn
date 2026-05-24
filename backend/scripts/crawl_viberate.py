#!/usr/bin/env python3
"""
Crawl Viberate top Vietnamese artists chart and seed the database.

Usage:
    cd backend
    python scripts/crawl_viberate.py             # crawl all pages into DB
    python scripts/crawl_viberate.py --dry-run   # print JSON, no DB write
    python scripts/crawl_viberate.py --pages 2   # crawl first 2 pages only
"""

import asyncio
import json
import re
import sys
import os
import argparse

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Allow running from backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

import httpx
from bs4 import BeautifulSoup

CHART_URL = "https://www.viberate.com/music-charts/top-artists-from-vietnam-{page}/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
}


def parse_page(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    artists = []

    # Viberate renders artists as rows; find all artist anchor links
    artist_links = soup.find_all("a", href=re.compile(r"^/artist/[^/]+/?$"))

    for link in artist_links:
        name = link.get_text(strip=True)
        if not name:
            continue

        href = link.get("href", "")
        slug = href.strip("/").split("/")[-1]

        rank = None
        genre = None

        # Walk up DOM to find the row container, looking for rank (strong) and genre link
        elem = link
        for _ in range(8):
            elem = elem.parent
            if elem is None:
                break

            if rank is None:
                for strong in elem.find_all("strong"):
                    text = strong.get_text(strip=True).replace(",", "").replace(".", "")
                    try:
                        candidate = int(text)
                        if 1 <= candidate <= 99999:
                            rank = candidate
                            break
                    except ValueError:
                        pass

            if genre is None:
                g_link = elem.find("a", href=re.compile(r"^/genre/"))
                if g_link:
                    genre = g_link.get_text(strip=True)

            if rank is not None and genre is not None:
                break

        # Fallback: try to extract rank from sibling text
        if rank is None:
            # Sometimes rank is in a data attribute or nearby text node
            parent = link.parent
            if parent:
                text = parent.get_text(separator=" ", strip=True)
                nums = re.findall(r"\b(\d{1,5})\b", text)
                for n in nums:
                    candidate = int(n)
                    if 1 <= candidate <= 99999:
                        rank = candidate
                        break

        if name and rank:
            artists.append({
                "rank": rank,
                "name": name,
                "slug": slug,
                "genre": genre,
            })

    return artists


async def fetch_page(client: httpx.AsyncClient, page: int) -> str | None:
    url = CHART_URL.format(page=page)
    try:
        resp = await client.get(url, headers=HEADERS, timeout=20, follow_redirects=True)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"  Error fetching page {page}: {e}", file=sys.stderr)
        return None


async def crawl_all(max_pages: int | None = None) -> list[dict]:
    all_artists: list[dict] = []
    seen_slugs: set[str] = set()

    async with httpx.AsyncClient() as client:
        page = 0
        while True:
            if max_pages is not None and page >= max_pages:
                break

            print(f"Fetching page {page}...", flush=True)
            html = await fetch_page(client, page)
            if html is None:
                print(f"Page {page} not found — stopping.")
                break

            artists = parse_page(html)
            if not artists:
                print(f"Page {page} returned 0 artists — stopping.")
                break

            new = 0
            for a in artists:
                if a["slug"] not in seen_slugs:
                    seen_slugs.add(a["slug"])
                    all_artists.append(a)
                    new += 1

            print(f"  -> {new} new artists (total: {len(all_artists)})")

            if new == 0:
                print("No new artists found — stopping.")
                break

            page += 1
            await asyncio.sleep(1.0)  # polite crawl delay

    return all_artists


async def seed_db(artists: list[dict]):
    from app.database import engine, Base
    from app.models import Artist  # noqa
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        for batch_start in range(0, len(artists), 100):
            batch = artists[batch_start:batch_start + 100]
            stmt = pg_insert(Artist).values([
                {
                    "rank": a["rank"],
                    "name": a["name"],
                    "slug": a["slug"],
                    "genre": a.get("genre"),
                    "popularity": None,
                    "avatar_url": None,
                }
                for a in batch
            ]).on_conflict_do_update(
                index_elements=["slug"],
                set_={
                    "rank": pg_insert(Artist).excluded.rank,
                    "name": pg_insert(Artist).excluded.name,
                    "genre": pg_insert(Artist).excluded.genre,
                },
            )
            await session.execute(stmt)
        await session.commit()

    print(f"[OK] Upserted {len(artists)} artists into database.")


async def main():
    parser = argparse.ArgumentParser(description="Crawl Viberate VN artists chart")
    parser.add_argument("--dry-run", action="store_true", help="Print JSON only, no DB write")
    parser.add_argument("--pages", type=int, default=None, help="Max pages to crawl (default: all)")
    args = parser.parse_args()

    print("Starting Viberate crawl...")
    artists = await crawl_all(max_pages=args.pages)
    print(f"\nCrawled {len(artists)} total artists.")

    if args.dry_run:
        print(json.dumps(artists, ensure_ascii=False, indent=2))
        return

    if not artists:
        print("No artists found. Check network connectivity or HTML structure.")
        return

    print("Seeding database...")
    await seed_db(artists)
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
