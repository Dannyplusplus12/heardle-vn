import asyncio
import re

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select, func

from app.routers.auth import require_admin
from app.database import AsyncSessionLocal
from app.models import Artist, Track, Playlist, PlaylistTrack, User

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


# ── Artists ──────────────────────────────────────────────────────────────────


class ArtistCreate(BaseModel):
    name: str
    avatar_url: str | None = None
    description: str | None = None
    genre: str | None = None
    soundcloud_url: str | None = None
    youtube_url: str | None = None


class ArtistUpdate(BaseModel):
    name: str | None = None
    avatar_url: str | None = None
    description: str | None = None
    genre: str | None = None
    soundcloud_url: str | None = None
    youtube_url: str | None = None
    playable: bool | None = None
    needs_manual_url: bool | None = None


def _artist_dict(a: Artist) -> dict:
    return {
        "id": a.id,
        "rank": a.rank,
        "name": a.name,
        "slug": a.slug,
        "genre": a.genre,
        "avatar_url": a.avatar_url,
        "description": a.description,
        "soundcloud_url": a.soundcloud_url,
        "youtube_url": a.youtube_url,
        "needs_manual_url": a.needs_manual_url,
        "playable": a.playable,
    }


@router.get("/artists")
async def admin_list_artists(
    needs_url: bool = False,
    admin: User = Depends(require_admin),
):
    async with AsyncSessionLocal() as db:
        q = select(Artist).order_by(Artist.rank)
        if needs_url:
            q = q.where(Artist.needs_manual_url.is_(True))
        result = await db.execute(q)
        return [_artist_dict(a) for a in result.scalars().all()]


@router.get("/artists/needs-url-count")
async def needs_url_count(admin: User = Depends(require_admin)):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(func.count()).select_from(Artist).where(Artist.needs_manual_url.is_(True))
        )
        return {"count": result.scalar_one()}


@router.post("/artists", status_code=201)
async def create_artist(body: ArtistCreate, admin: User = Depends(require_admin)):
    from app.crawler import crawl_artist_deezer, crawl_artist_soundcloud, crawl_artist_youtube

    slug = _slug(body.name)

    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(select(Artist).where(Artist.slug == slug))
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail=f"Artist '{body.name}' already exists")

        max_rank = (await db.execute(select(func.max(Artist.rank)))).scalar_one() or 0

        artist = Artist(
            rank=max_rank + 1,
            name=body.name,
            slug=slug,
            genre=body.genre,
            avatar_url=body.avatar_url,
            description=body.description,
            soundcloud_url=body.soundcloud_url,
            youtube_url=body.youtube_url,
        )
        db.add(artist)
        await db.commit()
        await db.refresh(artist)
        artist_id = artist.id

    sc_url = body.soundcloud_url
    yt_url = body.youtube_url
    artist_name = body.name

    async def _crawl():
        result = await crawl_artist_deezer(artist_id, artist_name)
        if result["status"] == "no_tracks":
            if sc_url:
                await crawl_artist_soundcloud(artist_id, artist_name, sc_url)
            if yt_url:
                await crawl_artist_youtube(artist_id, artist_name, yt_url)
        elif result["status"] == "ok":
            if sc_url:
                await crawl_artist_soundcloud(artist_id, artist_name, sc_url)
            if yt_url:
                await crawl_artist_youtube(artist_id, artist_name, yt_url)

    asyncio.create_task(_crawl())

    async with AsyncSessionLocal() as db:
        artist = await db.get(Artist, artist_id)
        return {**_artist_dict(artist), "crawl": "started"}


@router.put("/artists/{artist_id}")
async def update_artist(
    artist_id: int,
    body: ArtistUpdate,
    admin: User = Depends(require_admin),
):
    from app.crawler import crawl_artist_soundcloud, crawl_artist_youtube

    async with AsyncSessionLocal() as db:
        artist = await db.get(Artist, artist_id)
        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")

        old_sc = artist.soundcloud_url
        old_yt = artist.youtube_url

        if body.name is not None:
            artist.name = body.name
        if body.avatar_url is not None:
            artist.avatar_url = body.avatar_url
        if body.description is not None:
            artist.description = body.description
        if body.genre is not None:
            artist.genre = body.genre
        if body.soundcloud_url is not None:
            artist.soundcloud_url = body.soundcloud_url
        if body.youtube_url is not None:
            artist.youtube_url = body.youtube_url
        if body.playable is not None:
            artist.playable = body.playable
        if body.needs_manual_url is not None:
            artist.needs_manual_url = body.needs_manual_url

        await db.commit()
        await db.refresh(artist)
        snap = _artist_dict(artist)

    new_sc = body.soundcloud_url
    new_yt = body.youtube_url
    artist_name = snap["name"]

    async def _recrawl():
        if new_sc and new_sc != old_sc:
            await crawl_artist_soundcloud(artist_id, artist_name, new_sc)
        if new_yt and new_yt != old_yt:
            await crawl_artist_youtube(artist_id, artist_name, new_yt)

    asyncio.create_task(_recrawl())
    return snap


@router.delete("/artists/{artist_id}")
async def delete_artist(artist_id: int, admin: User = Depends(require_admin)):
    async with AsyncSessionLocal() as db:
        artist = await db.get(Artist, artist_id)
        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")
        await db.delete(artist)
        await db.commit()
    return {"deleted": artist_id}


@router.get("/artists/{artist_id}/tracks")
async def list_artist_tracks(artist_id: int, admin: User = Depends(require_admin)):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Track).where(Track.artist_id == artist_id).order_by(Track.title)
        )
        return [
            {
                "id": t.id,
                "title": t.title,
                "source": t.source,
                "source_id": t.source_id,
                "cover_url": t.cover_url,
                "permalink_url": t.permalink_url,
            }
            for t in result.scalars().all()
        ]


@router.delete("/artists/{artist_id}/tracks/{track_id:path}")
async def delete_artist_track(
    artist_id: int,
    track_id: str,
    admin: User = Depends(require_admin),
):
    async with AsyncSessionLocal() as db:
        track = await db.get(Track, track_id)
        if not track or track.artist_id != artist_id:
            raise HTTPException(status_code=404, detail="Track not found")
        await db.delete(track)

        from sqlalchemy import func as sqlfunc
        from app.seeder import MIN_SONGS
        track_count = (await db.execute(
            select(sqlfunc.count()).select_from(Track).where(Track.artist_id == artist_id)
        )).scalar_one()
        artist_row = await db.get(Artist, artist_id)
        if artist_row:
            artist_row.playable = track_count >= MIN_SONGS
        await db.commit()
    return {"deleted": track_id}


class AddArtistTrackBody(BaseModel):
    soundcloud_url: str | None = None
    deezer_url: str | None = None
    title: str | None = None


@router.post("/artists/{artist_id}/tracks", status_code=201)
async def add_track_to_artist(
    artist_id: int,
    body: AddArtistTrackBody,
    admin: User = Depends(require_admin),
):
    from app import soundcloud
    from app.models import Track
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy import func as sqlfunc
    from app.seeder import MIN_SONGS

    async with AsyncSessionLocal() as db:
        artist = await db.get(Artist, artist_id)
        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")
        artist_name = artist.name

    if body.deezer_url:
        from app.deezer import resolve_deezer_track
        track_info = await resolve_deezer_track(body.deezer_url)
        if not track_info:
            raise HTTPException(status_code=422, detail="Could not resolve Deezer URL — check the URL and ensure the track has a preview")
        track_info["artist_name"] = artist_name
    elif body.soundcloud_url:
        track_info = await soundcloud.resolve_track(body.soundcloud_url)
        if not track_info:
            raise HTTPException(status_code=422, detail="Could not resolve SoundCloud URL — check the URL or track duration (must be < 10 min)")
    else:
        raise HTTPException(status_code=422, detail="Provide soundcloud_url or deezer_url")

    if body.title:
        track_info["title"] = body.title

    track_id = f"{track_info['source']}:{track_info['source_id']}"
    async with AsyncSessionLocal() as db:
        stmt = pg_insert(Track).values(
            id=track_id,
            title=track_info["title"][:300],
            artist_name=artist_name,
            artist_id=artist_id,
            source=track_info["source"],
            source_id=track_info["source_id"],
            cover_url=track_info.get("cover_url"),
            permalink_url=track_info.get("permalink_url"),
        ).on_conflict_do_nothing(index_elements=["id"])
        await db.execute(stmt)

        track_count = (await db.execute(
            select(sqlfunc.count()).select_from(Track).where(Track.artist_id == artist_id)
        )).scalar_one()
        artist_row = await db.get(Artist, artist_id)
        if artist_row:
            artist_row.playable = track_count >= MIN_SONGS
        await db.commit()

    return {"track_id": track_id, "title": track_info["title"], "artist_id": artist_id}


@router.post("/artists/{artist_id}/crawl")
async def recrawl_artist(
    artist_id: int,
    source: str | None = None,  # 'deezer' | 'soundcloud' | 'youtube' | None (all)
    admin: User = Depends(require_admin),
):
    from app.crawler import crawl_artist_deezer, crawl_artist_soundcloud, crawl_artist_youtube

    async with AsyncSessionLocal() as db:
        artist = await db.get(Artist, artist_id)
        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")
        snap = {"name": artist.name, "sc": artist.soundcloud_url, "yt": artist.youtube_url}

    async def _crawl():
        if not source or source == "deezer":
            await crawl_artist_deezer(artist_id, snap["name"])
        if (not source or source == "soundcloud") and snap["sc"]:
            await crawl_artist_soundcloud(artist_id, snap["name"], snap["sc"])
        if (not source or source == "youtube") and snap["yt"]:
            await crawl_artist_youtube(artist_id, snap["name"], snap["yt"])

    asyncio.create_task(_crawl())
    return {"status": "started", "artist_id": artist_id, "source": source or "all"}


# ── Playlists ─────────────────────────────────────────────────────────────────


class PlaylistCreate(BaseModel):
    name: str
    description: str | None = None
    cover_url: str | None = None


class PlaylistUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    cover_url: str | None = None


def _playlist_dict(p: Playlist) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "cover_url": p.cover_url,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("/playlists")
async def admin_list_playlists(admin: User = Depends(require_admin)):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Playlist).order_by(Playlist.created_at.desc()))
        return [_playlist_dict(p) for p in result.scalars().all()]


@router.post("/playlists", status_code=201)
async def create_playlist(body: PlaylistCreate, admin: User = Depends(require_admin)):
    async with AsyncSessionLocal() as db:
        pl = Playlist(
            name=body.name,
            description=body.description,
            cover_url=body.cover_url,
            created_by=admin.id,
        )
        db.add(pl)
        await db.commit()
        await db.refresh(pl)
        return _playlist_dict(pl)


@router.put("/playlists/{playlist_id}")
async def update_playlist(
    playlist_id: int,
    body: PlaylistUpdate,
    admin: User = Depends(require_admin),
):
    async with AsyncSessionLocal() as db:
        pl = await db.get(Playlist, playlist_id)
        if not pl:
            raise HTTPException(status_code=404, detail="Playlist not found")
        if body.name is not None:
            pl.name = body.name
        if body.description is not None:
            pl.description = body.description
        if body.cover_url is not None:
            pl.cover_url = body.cover_url
        await db.commit()
        await db.refresh(pl)
        return _playlist_dict(pl)


@router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: int, admin: User = Depends(require_admin)):
    async with AsyncSessionLocal() as db:
        pl = await db.get(Playlist, playlist_id)
        if not pl:
            raise HTTPException(status_code=404, detail="Playlist not found")
        # Cascade delete playlist tracks
        result = await db.execute(
            select(PlaylistTrack).where(PlaylistTrack.playlist_id == playlist_id)
        )
        for pt in result.scalars().all():
            await db.delete(pt)
        await db.delete(pl)
        await db.commit()
    return {"deleted": playlist_id}


# ── Playlist tracks ───────────────────────────────────────────────────────────


@router.get("/playlists/{playlist_id}/tracks")
async def admin_playlist_tracks(playlist_id: int, admin: User = Depends(require_admin)):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PlaylistTrack, Track)
            .join(Track, Track.id == PlaylistTrack.track_id)
            .where(PlaylistTrack.playlist_id == playlist_id)
            .order_by(PlaylistTrack.position)
        )
        return [
            {
                "pt_id": pt.id,
                "position": pt.position,
                "track": {
                    "id": t.id,
                    "title": t.title,
                    "artist": t.artist_name,
                    "cover_url": t.cover_url,
                },
            }
            for pt, t in result.all()
        ]


class AddPlaylistTrackBody(BaseModel):
    track_id: str


@router.post("/playlists/{playlist_id}/tracks", status_code=201)
async def add_track_to_playlist(
    playlist_id: int,
    body: AddPlaylistTrackBody,
    admin: User = Depends(require_admin),
):
    async with AsyncSessionLocal() as db:
        pl = await db.get(Playlist, playlist_id)
        if not pl:
            raise HTTPException(status_code=404, detail="Playlist not found")

        track = await db.get(Track, body.track_id)
        if not track:
            raise HTTPException(status_code=404, detail="Track not found")

        max_pos_result = await db.execute(
            select(func.max(PlaylistTrack.position)).where(PlaylistTrack.playlist_id == playlist_id)
        )
        max_pos = max_pos_result.scalar_one() or 0

        pt = PlaylistTrack(
            playlist_id=playlist_id,
            track_id=body.track_id,
            position=max_pos + 1,
        )
        db.add(pt)
        await db.commit()
        await db.refresh(pt)
        return {"pt_id": pt.id, "playlist_id": playlist_id, "track_id": body.track_id}


@router.delete("/playlists/{playlist_id}/tracks/{pt_id}")
async def remove_track_from_playlist(
    playlist_id: int,
    pt_id: int,
    admin: User = Depends(require_admin),
):
    async with AsyncSessionLocal() as db:
        pt = await db.get(PlaylistTrack, pt_id)
        if not pt or pt.playlist_id != playlist_id:
            raise HTTPException(status_code=404, detail="Track not in this playlist")
        await db.delete(pt)
        await db.commit()
    return {"deleted": pt_id}
