import logging

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app import auth as auth_service
from app import room_manager as rm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/doi-dau", tags=["doi-dau"])


def _parse_token(token: str) -> dict | None:
    try:
        return auth_service.verify_token(token)
    except Exception:
        return None


class CreateRoomRequest(BaseModel):
    artist_ids: list[int] = []
    playlist_ids: list[int] = []


@router.post("/rooms")
async def create_room(req: CreateRoomRequest, token: str = Query(...)):
    payload = _parse_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    room = rm.create_room(
        host_id=payload["sub"],
        host_name=payload["name"],
        is_guest=payload.get("is_guest", False),
        artist_ids=req.artist_ids,
        playlist_ids=req.playlist_ids,
    )
    return {"code": room.code}


@router.get("/rooms/{code}")
async def get_room_info(code: str):
    room = rm.get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="Phòng không tồn tại")
    state = rm._state_msg(room)
    state["player_count"] = len(room.players)
    return state


@router.websocket("/ws/{room_code}")
async def ws_endpoint(ws: WebSocket, room_code: str, token: str = Query(...)):
    await ws.accept()

    payload = _parse_token(token)
    if not payload:
        await ws.close(code=4001, reason="Invalid token")
        return

    room = rm.get_room(room_code)
    if not room:
        await ws.close(code=4004, reason="Room not found")
        return

    player_id = payload["sub"]
    name = payload["name"]
    is_guest = payload.get("is_guest", False)

    await rm.join_room(room, player_id, name, is_guest, ws)
    logger.info("Player %s joined room %s", name, room_code)

    try:
        while True:
            data = await ws.receive_json()
            t = data.get("type")

            if t == "ready":
                await rm.mark_ready(room, player_id)

            elif t == "guess":
                await rm.handle_guess(room, player_id, data.get("track_id", ""))

            elif t == "skip":
                await rm.handle_skip(room, player_id)

            elif t == "start_game":
                if player_id == room.host_id and room.phase == "lobby":
                    if rm._connected(room):
                        await rm.start_round(room)

            elif t == "next_round":
                if player_id == room.host_id and room.phase == "round_end":
                    if room.round >= room.total_rounds:
                        await rm.end_game(room)
                    else:
                        await rm.start_round(room)

    except WebSocketDisconnect:
        logger.info("Player %s disconnected from room %s", player_id, room_code)
        await rm.player_disconnect(room, player_id)
    except Exception as e:
        logger.error("WS error %s in %s: %s", player_id, room_code, e)
        await rm.player_disconnect(room, player_id)
