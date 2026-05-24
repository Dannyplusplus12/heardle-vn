from fastapi import APIRouter
from sqlalchemy import select, func

from app.database import AsyncSessionLocal
from app.models import Playlist, PlaylistTrack, Track

router = APIRouter(prefix="/api/playlists", tags=["playlists"])


@router.get("")
async def list_playlists():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Playlist).order_by(Playlist.created_at.desc()))
        playlists = result.scalars().all()

        counts = {}
        for pl in playlists:
            count_result = await db.execute(
                select(func.count()).select_from(PlaylistTrack).where(PlaylistTrack.playlist_id == pl.id)
            )
            counts[pl.id] = count_result.scalar_one()

    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "cover_url": p.cover_url,
            "track_count": counts.get(p.id, 0),
        }
        for p in playlists
    ]


@router.get("/{playlist_id}/tracks")
async def playlist_tracks(playlist_id: int):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PlaylistTrack, Track)
            .join(Track, Track.id == PlaylistTrack.track_id)
            .where(PlaylistTrack.playlist_id == playlist_id)
            .order_by(PlaylistTrack.position)
        )
        return [
            {
                "id": t.id,
                "title": t.title,
                "artist": t.artist_name,
                "cover_url": t.cover_url,
            }
            for _, t in result.all()
        ]
