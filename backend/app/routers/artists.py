from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.deezer import get_artist_profiles
from app.models import Artist

router = APIRouter(prefix="/api", tags=["artists"])

_FALLBACK_ARTISTS = [
    {"id": i + 1, "rank": i + 1, "name": n, "slug": n.lower().replace(" ", "-"), "genre": g, "popularity": None, "avatar_url": None}
    for i, (n, g) in enumerate([
        ("Son Tung MTP", "Pop"), ("HIEUTHUHAI", "Hip Hop"), ("Den Vau", "Hip Hop"),
        ("Hoa Minzy", "Pop"), ("SOOBIN", "Pop"), ("JustaTee", "Hip Hop"),
        ("Vu.", "Indie"), ("tlinh", "Hip Hop"), ("Wren Evans", "Pop"),
        ("Hoang Thuy Linh", "Pop"), ("MONO", "Pop"), ("Tang Duy Tan", "Pop"),
        ("My Tam", "Pop"), ("Bich Phuong", "Pop"), ("AMEE", "Pop"),
        ("Erik", "Pop"), ("Grey D", "Indie"), ("Binz", "Hip Hop"),
        ("Jack J97", "Pop"), ("Obito", "Hip Hop"), ("Da LAB", "Indie"),
        ("Phuong My Chi", "Pop"), ("Vu Cat Tuong", "Indie"), ("Bray", "Hip Hop"),
        ("Noo Phuoc Thinh", "Pop"), ("RPT MCK", "Hip Hop"), ("Duy Manh", "Pop"),
        ("Bao Thy", "Pop"), ("Tuan Hung", "Pop"), ("Ho Ngoc Ha", "Pop"),
    ])
]


def _apply_fallback(search: str, limit: int, offset: int) -> list:
    filtered = _FALLBACK_ARTISTS
    if search.strip():
        s = search.strip().lower()
        filtered = [a for a in _FALLBACK_ARTISTS if s in a["name"].lower()]
    return filtered[offset:offset + limit]


@router.get("/artists")
async def list_artists(
    search: str = Query(default=""),
    limit: int = Query(default=60, le=200),
    offset: int = Query(default=0),
):
    # Session is created inside try/except so DB failures are caught
    # and CORS middleware always gets a proper response to wrap.
    try:
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            q = select(Artist).order_by(Artist.rank)
            if search.strip():
                q = q.where(Artist.name.ilike(f"%{search.strip()}%"))
            result = await db.execute(q.limit(limit).offset(offset))
            rows = result.scalars().all()

        if not rows and offset == 0:
            return _apply_fallback(search, limit, 0)

        return [
            {
                "id": a.id,
                "rank": a.rank,
                "name": a.name,
                "slug": a.slug,
                "genre": a.genre,
                "popularity": a.popularity,
                "avatar_url": a.avatar_url,
            }
            for a in rows
        ]
    except Exception:
        return _apply_fallback(search, limit, offset)


@router.get("/artists/profiles")
async def artist_profiles(names: str = Query(...)):
    try:
        name_list = [n.strip() for n in names.split(',') if n.strip()]
        return await get_artist_profiles(name_list)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
