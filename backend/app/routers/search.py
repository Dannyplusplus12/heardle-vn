from fastapi import APIRouter, HTTPException, Query
from app.soundcloud import search_tracks

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
async def search(q: str = Query(..., min_length=1, max_length=100)):
    try:
        return await search_tracks(q, limit=10)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
