from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String, Text, DateTime, Boolean, func
from app.database import Base


class Artist(Base):
    __tablename__ = "artists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rank: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    genre: Mapped[str | None] = mapped_column(String(100), nullable=True)
    popularity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # False once a reseed confirms the artist has <=10 playable songs anywhere.
    playable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Track(Base):
    __tablename__ = "tracks"

    # Composite id: "{source}:{source_id}", e.g. "deezer:123", "soundcloud:456",
    # "youtube:dQw4w9WgXcQ" — lets the clip endpoint route to the right platform.
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    artist_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="deezer")
    source_id: Mapped[str] = mapped_column(String(80), nullable=False)
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    permalink_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
