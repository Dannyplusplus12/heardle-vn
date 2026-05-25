"""
In-memory multiplayer room state machine for ĐỐI ĐẦU mode.
All mutations happen in the same asyncio event loop — no locking needed.
"""
import asyncio
import json
import logging
import random
import string
import time
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

MAX_ROUNDS = 9
BASE_SCORES = [1000, 800, 600, 450, 300]
READY_TIMEOUT_SEC = 30
ROUND_DURATION_SEC = 60


# ── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class Player:
    id: str
    name: str
    is_guest: bool = True
    score: int = 0
    is_ready: bool = False
    has_guessed: bool = False
    correct_this_round: bool = False
    round_pts: int = 0
    ws: Optional[Any] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "is_guest": self.is_guest,
            "score": self.score,
            "is_ready": self.is_ready,
            "has_guessed": self.has_guessed,
            "correct_this_round": self.correct_this_round,
            "round_pts": self.round_pts,
        }


@dataclass
class Room:
    code: str
    host_id: str
    phase: str = "lobby"
    players: dict = field(default_factory=dict)
    artist_ids: list = field(default_factory=list)
    playlist_ids: list = field(default_factory=list)
    current_track: Optional[dict] = None
    round: int = 0
    total_rounds: int = MAX_ROUNDS
    guess_order: list = field(default_factory=list)
    round_start_time: Optional[float] = None
    _task: Optional[asyncio.Task] = None


_rooms: dict[str, Room] = {}


# ── Room lifecycle ────────────────────────────────────────────────────────────

def _gen_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=6))


def create_room(host_id: str, host_name: str, is_guest: bool,
                artist_ids: list, playlist_ids: list) -> Room:
    code = _gen_code()
    while code in _rooms:
        code = _gen_code()
    room = Room(code=code, host_id=host_id,
                artist_ids=artist_ids, playlist_ids=playlist_ids)
    room.players[host_id] = Player(id=host_id, name=host_name, is_guest=is_guest)
    _rooms[code] = room
    return room


def get_room(code: str) -> Optional[Room]:
    return _rooms.get(code.upper())


def remove_room(code: str):
    _rooms.pop(code.upper(), None)


# ── Messaging ─────────────────────────────────────────────────────────────────

async def broadcast(room: Room, msg: dict, exclude_id: str = None):
    data = json.dumps(msg, ensure_ascii=False)
    dead = []
    for pid, player in list(room.players.items()):
        if pid == exclude_id or player.ws is None:
            continue
        try:
            await player.ws.send_text(data)
        except Exception:
            dead.append(pid)
    for pid in dead:
        await _disconnect(room, pid)


async def _send(player: Player, msg: dict):
    if player.ws:
        try:
            await player.ws.send_text(json.dumps(msg, ensure_ascii=False))
        except Exception:
            pass


def _state_msg(room: Room) -> dict:
    sorted_players = sorted(room.players.values(), key=lambda p: -p.score)
    return {
        "type": "room_state",
        "phase": room.phase,
        "round": room.round,
        "total_rounds": room.total_rounds,
        "host_id": room.host_id,
        "code": room.code,
        "artist_ids": room.artist_ids,
        "playlist_ids": room.playlist_ids,
        "players": [p.to_dict() for p in sorted_players],
    }


# ── Player join / disconnect ──────────────────────────────────────────────────

async def join_room(room: Room, player_id: str, name: str, is_guest: bool, ws) -> None:
    if player_id in room.players:
        room.players[player_id].ws = ws
        room.players[player_id].name = name
    else:
        late = room.phase != "lobby"
        room.players[player_id] = Player(
            id=player_id, name=name, is_guest=is_guest, ws=ws,
            has_guessed=late,
        )

    player = room.players[player_id]
    await _send(player, _state_msg(room))

    if room.current_track and room.phase in ("playing", "loading", "countdown", "round_end"):
        await _send(player, {
            "type": "round_start",
            "track_id": room.current_track["id"],
            "round": room.round,
            "total_rounds": room.total_rounds,
        })

    await broadcast(room, {"type": "player_joined", "player": player.to_dict()}, exclude_id=player_id)


async def _disconnect(room: Room, player_id: str):
    if player_id not in room.players:
        return
    room.players[player_id].ws = None
    await broadcast(room, {"type": "player_left", "player_id": player_id})

    connected = [pid for pid, p in room.players.items() if p.ws]
    if room.host_id == player_id and connected:
        room.host_id = connected[0]
        await broadcast(room, {"type": "host_changed", "host_id": room.host_id})

    if not connected:
        asyncio.create_task(_deferred_cleanup(room.code))


async def player_disconnect(room: Room, player_id: str):
    await _disconnect(room, player_id)


async def _deferred_cleanup(code: str, delay: int = 300):
    await asyncio.sleep(delay)
    room = _rooms.get(code.upper())
    if room and not any(p.ws for p in room.players.values()):
        remove_room(code)
        logger.info("Room %s cleaned up (no players)", code)


# ── Track picking ─────────────────────────────────────────────────────────────

async def _pick_track(room: Room) -> Optional[dict]:
    from app.routers.game import _random_from_pool, _random_from_genre
    try:
        if room.artist_ids or room.playlist_ids:
            return await _random_from_pool(room.artist_ids, room.playlist_ids)
        return await _random_from_genre(None, None)
    except Exception as e:
        logger.error("Track pick error: %s", e)
        return None


# ── Scoring ───────────────────────────────────────────────────────────────────

def _calc_score(position: int, elapsed: float) -> int:
    base = BASE_SCORES[min(position, len(BASE_SCORES) - 1)]
    time_pct = max(0.0, 1.0 - elapsed / ROUND_DURATION_SEC)
    bonus = int(time_pct * 200)
    return base + bonus


# ── Game state machine ────────────────────────────────────────────────────────

def _connected(room: Room) -> list[Player]:
    return [p for p in room.players.values() if p.ws]


async def start_round(room: Room):
    room.phase = "loading"
    room.guess_order = []
    room.round_start_time = None

    for p in room.players.values():
        p.is_ready = False
        p.has_guessed = False
        p.correct_this_round = False
        p.round_pts = 0

    track = await _pick_track(room)
    if not track:
        await broadcast(room, {"type": "error", "message": "Không thể tải bài hát. Thử lại."})
        room.phase = "lobby"
        await broadcast(room, _state_msg(room))
        return

    room.current_track = track
    room.round += 1

    await broadcast(room, {
        "type": "round_start",
        "track_id": track["id"],
        "round": room.round,
        "total_rounds": room.total_rounds,
    })
    await broadcast(room, _state_msg(room))

    if room._task:
        room._task.cancel()
    room._task = asyncio.create_task(_ready_wait(room))


async def _ready_wait(room: Room):
    await asyncio.sleep(READY_TIMEOUT_SEC)
    if room.phase == "loading":
        await _do_countdown(room)


async def mark_ready(room: Room, player_id: str):
    if player_id not in room.players or room.phase != "loading":
        return
    room.players[player_id].is_ready = True

    conn = _connected(room)
    ready_cnt = sum(1 for p in conn if p.is_ready)

    await broadcast(room, {
        "type": "player_ready",
        "player_id": player_id,
        "ready_count": ready_cnt,
        "total": len(conn),
    })

    if ready_cnt >= len(conn):
        if room._task:
            room._task.cancel()
        await _do_countdown(room)


async def _do_countdown(room: Room):
    if room.phase not in ("loading", "countdown"):
        return
    room.phase = "countdown"
    await broadcast(room, _state_msg(room))

    for sec in (3, 2, 1):
        await broadcast(room, {"type": "countdown", "seconds": sec})
        await asyncio.sleep(1)

    room.phase = "playing"
    room.round_start_time = time.time()
    await broadcast(room, {"type": "play_now"})
    await broadcast(room, _state_msg(room))

    if room._task:
        room._task.cancel()
    room._task = asyncio.create_task(_round_clock(room))


async def _round_clock(room: Room):
    await asyncio.sleep(ROUND_DURATION_SEC)
    if room.phase == "playing":
        await end_round(room)


async def handle_guess(room: Room, player_id: str, track_id: str):
    if room.phase != "playing" or player_id not in room.players:
        return
    player = room.players[player_id]
    if player.has_guessed:
        return

    correct = track_id == room.current_track["id"]
    player.has_guessed = True

    if correct:
        player.correct_this_round = True
        elapsed = time.time() - (room.round_start_time or time.time())
        pos = len(room.guess_order)
        pts = _calc_score(pos, elapsed)
        player.score += pts
        player.round_pts = pts
        room.guess_order.append(player_id)
        await broadcast(room, {
            "type": "player_guessed",
            "player_id": player_id,
            "name": player.name,
            "correct": True,
            "position": pos + 1,
        })
    else:
        await broadcast(room, {
            "type": "player_guessed",
            "player_id": player_id,
            "name": player.name,
            "correct": False,
        })

    if all(p.has_guessed for p in _connected(room)):
        if room._task:
            room._task.cancel()
        await asyncio.sleep(1.5)
        await end_round(room)


async def handle_skip(room: Room, player_id: str):
    if room.phase != "playing" or player_id not in room.players:
        return
    player = room.players[player_id]
    if player.has_guessed:
        return
    player.has_guessed = True
    await broadcast(room, {
        "type": "player_guessed",
        "player_id": player_id,
        "name": player.name,
        "correct": False,
    })
    if all(p.has_guessed for p in _connected(room)):
        if room._task:
            room._task.cancel()
        await asyncio.sleep(1.5)
        await end_round(room)


async def end_round(room: Room):
    if room.phase not in ("playing", "countdown"):
        return
    room.phase = "round_end"

    conn = _connected(room)
    scores = sorted(
        [
            {
                "player_id": p.id,
                "name": p.name,
                "score": p.score,
                "round_pts": p.round_pts,
                "correct": p.correct_this_round,
            }
            for p in conn
        ],
        key=lambda x: -x["score"],
    )

    await broadcast(room, {
        "type": "round_end",
        "track": room.current_track,
        "scores": scores,
        "round": room.round,
        "total_rounds": room.total_rounds,
    })
    await broadcast(room, _state_msg(room))

    # Bonus round if tied at the top after final round
    if room.round >= room.total_rounds and room.total_rounds == MAX_ROUNDS and len(scores) >= 2:
        if scores[0]["score"] == scores[1]["score"]:
            room.total_rounds += 1


async def end_game(room: Room):
    room.phase = "game_end"
    conn = _connected(room)
    final = sorted(
        [{"player_id": p.id, "name": p.name, "score": p.score} for p in conn],
        key=lambda x: -x["score"],
    )
    winner = final[0] if final else None
    await broadcast(room, {"type": "game_end", "final_scores": final, "winner": winner})
    await broadcast(room, _state_msg(room))
