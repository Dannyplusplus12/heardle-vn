from fastapi import APIRouter, HTTPException, Query
from app.soundcloud import get_artist_profiles

router = APIRouter(prefix="/api", tags=["artists"])


@router.get("/artists/profiles")
async def artist_profiles(names: str = Query(...)):
    try:
        name_list = [n.strip() for n in names.split(',') if n.strip()]
        return await get_artist_profiles(name_list)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
