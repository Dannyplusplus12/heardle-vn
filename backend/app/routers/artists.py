from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
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


@router.get("/artists")
async def list_artists(
    search: str = Query(default=""),
    limit: int = Query(default=60, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
):
    try:
        q = select(Artist).order_by(Artist.rank)
        if search.strip():
            q = q.where(Artist.name.ilike(f"%{search.strip()}%"))
        result = await db.execute(q.limit(limit).offset(offset))
        artists = result.scalars().all()

        if not artists and offset == 0:
            filtered = _FALLBACK_ARTISTS
            if search.strip():
                s = search.strip().lower()
                filtered = [a for a in _FALLBACK_ARTISTS if s in a["name"].lower()]
            return filtered[:limit]

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
            for a in artists
        ]
    except Exception:
        filtered = _FALLBACK_ARTISTS
        if search.strip():
            s = search.strip().lower()
            filtered = [a for a in _FALLBACK_ARTISTS if s in a["name"].lower()]
        return filtered[:limit]


@router.get("/artists/profiles")
async def artist_profiles(names: str = Query(...)):
    try:
        name_list = [n.strip() for n in names.split(',') if n.strip()]
        return await get_artist_profiles(name_list)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
