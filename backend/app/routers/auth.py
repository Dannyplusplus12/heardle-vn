from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select

from app import auth as auth_service
from app.database import AsyncSessionLocal
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User | None:
    if not creds:
        return None
    try:
        payload = auth_service.verify_token(creds.credentials)
        user_id = int(payload["sub"])
        async with AsyncSessionLocal() as db:
            return await db.get(User, user_id)
    except Exception:
        return None


async def require_admin(user: User | None = Depends(get_current_user)) -> User:
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin required")
    return user


class GoogleLoginRequest(BaseModel):
    id_token: str


@router.post("/google")
async def google_login(req: GoogleLoginRequest):
    try:
        info = await auth_service.verify_google_token(req.id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == info["email"]))
        user = result.scalar_one_or_none()

        if user:
            user.name = info["name"] or user.name
            user.picture = info["picture"]
            user.google_id = info["google_id"]
        else:
            user = User(
                email=info["email"],
                name=info["name"],
                picture=info["picture"],
                google_id=info["google_id"],
                is_admin=auth_service.is_admin_email(info["email"]),
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)

    token = auth_service.create_token(user.id, user.email, user.name, user.is_admin)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
            "is_admin": user.is_admin,
        },
    }


class GuestLoginRequest(BaseModel):
    name: str


@router.post("/guest")
async def guest_login(req: GuestLoginRequest):
    name = req.name.strip()[:30]
    if not name:
        raise HTTPException(status_code=422, detail="Tên không được trống")
    token, guest_id = auth_service.create_guest_token(name)
    return {
        "token": token,
        "user": {"id": guest_id, "name": name, "is_guest": True, "email": None, "picture": None, "is_admin": False},
    }


@router.get("/me")
async def me(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = auth_service.verify_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    if payload.get("is_guest"):
        return {
            "id": payload["sub"],
            "name": payload["name"],
            "is_guest": True,
            "email": None,
            "picture": None,
            "is_admin": False,
        }

    user_id = int(payload["sub"])
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "is_admin": user.is_admin,
        "is_guest": False,
    }
