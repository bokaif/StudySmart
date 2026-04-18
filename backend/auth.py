"""FastAPI auth dependencies backed by Firebase ID tokens."""
from typing import Optional

from fastapi import Header, HTTPException, status

from firebase_admin_init import db, fb_auth


class AuthedUser(dict):
    """Shaped dict for downstream handlers. Keys: uid, email, role, displayName."""


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> AuthedUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.split(" ", 1)[1].strip()
    try:
        decoded = fb_auth.verify_id_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid ID token: {e}",
        )

    uid = decoded["uid"]
    profile_snap = db.collection("users").document(uid).get()
    profile = profile_snap.to_dict() if profile_snap.exists else {}

    return AuthedUser(
        uid=uid,
        email=decoded.get("email") or profile.get("email"),
        displayName=profile.get("displayName") or decoded.get("name"),
        photoURL=profile.get("photoURL") or decoded.get("picture"),
        role=profile.get("role"),
    )


async def optional_current_user(
    authorization: Optional[str] = Header(None),
) -> Optional[AuthedUser]:
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


async def require_teacher(
    authorization: Optional[str] = Header(None),
) -> AuthedUser:
    user = await get_current_user(authorization)
    if user.get("role") != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher role required",
        )
    return user
