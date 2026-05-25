import os
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from jose import JWTError, jwt

_JWT_SECRET = os.getenv("JWT_SECRET", "heardle-vn-jwt-secret-change-in-production")
_JWT_ALGORITHM = "HS256"
_JWT_EXPIRE_DAYS = 30
_ADMIN_EMAILS = {
    e.strip()
    for e in os.getenv("ADMIN_EMAILS", "huyh13530@gmail.com").split(",")
    if e.strip()
}


def create_token(user_id: int, email: str, name: str, is_admin: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=_JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "name": name, "is_admin": is_admin, "exp": expire},
        _JWT_SECRET,
        algorithm=_JWT_ALGORITHM,
    )


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")


async def verify_google_token(id_token: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
        if resp.status_code != 200:
            raise ValueError("Invalid Google token")
        data = resp.json()
        if "error" in data:
            raise ValueError(f"Google token error: {data['error']}")
        return {
            "google_id": data.get("sub"),
            "email": data.get("email", ""),
            "name": data.get("name", ""),
            "picture": data.get("picture"),
        }


def create_guest_token(name: str) -> tuple[str, str]:
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    token = jwt.encode(
        {"sub": guest_id, "name": name, "is_guest": True, "exp": expire},
        _JWT_SECRET,
        algorithm=_JWT_ALGORITHM,
    )
    return token, guest_id


def is_admin_email(email: str) -> bool:
    return email.lower() in {e.lower() for e in _ADMIN_EMAILS}
