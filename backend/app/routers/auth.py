import re

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from app import auth as auth_service
from app.database import AsyncSessionLocal
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "name": user.name,
        "picture": user.picture,
        "bio": user.bio,
        "is_admin": user.is_admin,
        "is_guest": False,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


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


# ── Google OAuth ───────────────────────────────────────────────────────────────

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

    token = auth_service.create_token(
        user.id, user.email, user.name, user.is_admin, user.username
    )
    return {"token": token, "user": _user_dict(user)}


# ── Username / password register ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    name: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not _USERNAME_RE.match(v):
            raise ValueError("Username chỉ được dùng chữ, số và _ (3–30 ký tự)")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 50:
            raise ValueError("Tên hiển thị phải từ 1–50 ký tự")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Mật khẩu ít nhất 6 ký tự")
        return v


@router.post("/register")
async def register(req: RegisterRequest):
    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(User).where(User.username == req.username)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username đã được dùng")

        user = User(
            username=req.username,
            name=req.name,
            password_hash=auth_service.hash_password(req.password),
            is_admin=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = auth_service.create_token(
        user.id, user.email, user.name, user.is_admin, user.username
    )
    return {"token": token, "user": _user_dict(user)}


# ── Username / password login ──────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(req: LoginRequest):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.username == req.username.strip())
        )
        user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")
    if not auth_service.verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")

    token = auth_service.create_token(
        user.id, user.email, user.name, user.is_admin, user.username
    )
    return {"token": token, "user": _user_dict(user)}


# ── Guest login ────────────────────────────────────────────────────────────────

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
        "user": {
            "id": guest_id,
            "name": name,
            "is_guest": True,
            "email": None,
            "username": None,
            "picture": None,
            "bio": None,
            "is_admin": False,
        },
    }


# ── /me ────────────────────────────────────────────────────────────────────────

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
            "username": None,
            "picture": None,
            "bio": None,
            "is_admin": False,
        }

    user_id = int(payload["sub"])
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return _user_dict(user)


# ── Profile update ─────────────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    name: str | None = None
    picture: str | None = None
    bio: str | None = None
    current_password: str | None = None
    new_password: str | None = None


@router.put("/profile")
async def update_profile(
    req: UpdateProfileRequest,
    user: User | None = Depends(get_current_user),
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as db:
        db_user = await db.get(User, user.id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        if req.name is not None:
            name = req.name.strip()
            if not name or len(name) > 50:
                raise HTTPException(status_code=422, detail="Tên phải từ 1–50 ký tự")
            db_user.name = name

        if req.picture is not None:
            db_user.picture = req.picture.strip() or None

        if req.bio is not None:
            bio = req.bio.strip()
            db_user.bio = bio[:300] if bio else None

        if req.new_password:
            if len(req.new_password) < 6:
                raise HTTPException(status_code=422, detail="Mật khẩu mới ít nhất 6 ký tự")
            if db_user.password_hash:
                if not req.current_password:
                    raise HTTPException(status_code=422, detail="Cần nhập mật khẩu hiện tại")
                if not auth_service.verify_password(req.current_password, db_user.password_hash):
                    raise HTTPException(status_code=401, detail="Mật khẩu hiện tại không đúng")
            db_user.password_hash = auth_service.hash_password(req.new_password)

        await db.commit()
        await db.refresh(db_user)

    token = auth_service.create_token(
        db_user.id, db_user.email, db_user.name, db_user.is_admin, db_user.username
    )
    return {"token": token, "user": _user_dict(db_user)}
