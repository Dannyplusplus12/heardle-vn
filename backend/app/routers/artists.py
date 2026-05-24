from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.deezer import get_artist_profiles
from app.models import Artist

router = APIRouter(prefix="/api", tags=["artists"])

_FALLBACK_ARTISTS = [
    {"id": i + 1, "rank": i + 1, "name": n, "slug": n.lower().replace(" ", "-"), "genre": g, "popularity": None, "avatar_url": None}
    for i, (n, g) in enumerate([
        # Ranks 1-50
        ("Son Tung MTP", "Pop"), ("HIEUTHUHAI", "Hip Hop"), ("Den Vau", "Hip Hop"),
        ("Hoa Minzy", "Pop"), ("SOOBIN", "Pop"), ("JustaTee", "Hip Hop"),
        ("Bui Truong Linh", "Pop"), ("Vu.", "Indie"), ("Jack J97", "Pop"),
        ("MIN", "Pop"), ("RPT MCK", "Hip Hop"), ("Obito", "Hip Hop"),
        ("Mr Siro", "Pop"), ("Quan A.P", "Pop"), ("Chau Khai Phong", "Pop"),
        ("Duc Phuc", "Pop"), ("Low G", "Hip Hop"), ("ACV", "Hip Hop"),
        ("Phung Khanh Linh", "Pop"), ("Erik", "Pop"), ("Quang Hung MasterD", "Pop"),
        ("Duong Domic", "Pop"), ("tlinh", "Hip Hop"), ("My Tam", "Pop"),
        ("Le Bao Binh", "Pop"), ("AMEE", "Pop"), ("Phuong Ly", "Pop"),
        ("Bich Phuong", "Pop"), ("Phan Manh Quynh", "Indie"), ("Huong Giang", "Pop"),
        ("Noo Phuoc Thinh", "Pop"), ("Phuong My Chi", "Pop"), ("Van Mai Huong", "Pop"),
        ("Wxrdie", "Hip Hop"), ("Da LAB", "Indie"), ("Bao Anh", "Pop"),
        ("Masew", "Pop"), ("Karik", "Hip Hop"), ("Thanh Hung", "Pop"),
        ("MONSTAR", "Pop"), ("Quang Anh Rhyder", "Pop"), ("Hoang Dung", "Indie"),
        ("Ngo Lan Huong", "Pop"), ("Ha Anh Tuan", "Pop"), ("Negav", "Hip Hop"),
        ("Lam Chan Khang", "Pop"), ("Vu Cat Tuong", "Indie"), ("B Ray", "Hip Hop"),
        ("Ngo Kien Huy", "Pop"), ("Hoang Thuy Linh", "Pop"),
        # Ranks 51-100
        ("Truc Nhan", "Pop"), ("Dat G", "Hip Hop"), ("Dam Vinh Hung", "Pop"),
        ("Orange", "Pop"), ("Toc Tien", "Pop"), ("Ngot", "Indie"),
        ("Quoc Thien", "Pop"), ("Juky San", "Pop"), ("Ho Quang Hieu", "Pop"),
        ("Hien Ho", "Pop"), ("Rhymastic", "Hip Hop"), ("Ho Viet Trung", "Pop"),
        ("LyLy", "Pop"), ("Tuan Hung", "Pop"), ("Chillies", "Rock"),
        ("Hoai Lam", "Pop"), ("Dong Nhi", "Pop"), ("Lou Hoang", "Pop"),
        ("Phao", "Pop"), ("Tang Duy Tan", "Pop"), ("Miu Le", "Pop"),
        ("Han Sara", "Pop"), ("Only C", "Hip Hop"), ("Ho Ngoc Ha", "Pop"),
        ("DatKaa", "Hip Hop"), ("Dinh Dung", "Pop"), ("MONO", "Pop"),
        ("Anh Tu Atus", "Pop"), ("Thuy Chi", "Pop"), ("GREY D", "Indie"),
        ("Wren Evans", "Pop"), ("Andree Right Hand", "Hip Hop"), ("Isaac", "Pop"),
        ("Trung Quan", "Pop"), ("HURRYKNG", "Hip Hop"), ("Thinh Suy", "Indie"),
        ("Thieu Bao Tram", "Pop"), ("Hoang Ton", "Pop"), ("Binh Gold", "Hip Hop"),
        ("Trinh Thang Binh", "Pop"), ("Minh Hang", "Pop"), ("BigDaddy", "Hip Hop"),
        ("The Men", "Pop"), ("Dan Truong", "Pop"), ("Bui Anh Tuan", "Pop"),
        ("Tang Phuc", "Pop"), ("Jun Pham", "Pop"), ("Bui Cong Nam", "Indie"),
        ("Duy Manh", "Pop"), ("Chi Dan", "Pop"),
        # Ranks 101-150
        ("Gin Tuan Kiet", "Pop"), ("Wowy", "Hip Hop"), ("Huong Tram", "Pop"),
        ("Suboi", "Hip Hop"), ("Kai Dinh", "Indie"), ("Suni Ha Linh", "Pop"),
        ("Cam Ly", "Pop"), ("Le Quyen", "Pop"), ("Tien Tien", "Indie"),
        ("Nguyen Tran Trung Quan", "Pop"), ("Thuy Tien", "Pop"), ("HuyR", "Pop"),
        ("Osad", "Hip Hop"), ("De Choat", "Hip Hop"), ("Le Thien Hieu", "Indie"),
        ("My Linh", "Pop"), ("Nguyen Dinh Vu", "Pop"), ("Lynk Lee", "Pop"),
        ("Khac Viet", "Pop"), ("Lam Truong", "Pop"), ("Song Luan", "Pop"),
        ("Hua Kim Tuyen", "Indie"), ("Bao Thy", "Pop"), ("Tuan Vu", "Pop"),
        ("Nhu Quynh", "Pop"), ("Quang Ha", "Pop"), ("Minh Tuyet", "Pop"),
        ("Yen Trang", "Pop"), ("Phi Phuong Anh", "Pop"), ("Thanh Thao", "Pop"),
        ("Ho Quynh Huong", "Pop"), ("Uyen Linh", "Pop"), ("Lam Chan Huy", "Pop"),
        ("Gill", "Pop"), ("Seachains", "Indie"), ("Kimmese", "Hip Hop"),
        ("Cukak", "Hip Hop"), ("Khoi My", "Pop"), ("Luu Huong Giang", "Pop"),
        ("Quang Le", "Pop"), ("Trang Phap", "Pop"), ("Hannie", "Pop"),
        ("Trung Kien", "Pop"), ("Ho Van Cuong", "Pop"), ("Cara", "Pop"),
        ("Thai Trinh", "Pop"), ("Vo Ha Tram", "Pop"), ("Uni5", "Pop"),
        ("Mlee", "Pop"), ("SOL7", "Hip Hop"),
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

        if not rows:
            return _apply_fallback(search, limit, offset)

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
