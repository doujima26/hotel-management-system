from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.response import ok
from app.core.security import create_token, decode_token
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import LoginRequest, RefreshTokenRequest, RegisterRequest
from app.services.auth_service import login_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


# Xu ly dang ky tai khoan moi.
@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    data = register_user(db, payload)
    return ok(data, "Dang ky thanh cong")


# Xu ly dang nhap va cap token.
@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    data = login_user(db, payload)
    return ok(data, "Dang nhap thanh cong")


# Tao access token moi tu refresh token.
@router.post("/refresh")
def refresh_token(payload: RefreshTokenRequest):
    token_payload = decode_token(payload.refresh_token)
    if token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token khong hop le",
        )

    subject = token_payload.get("sub")
    access_token = create_token(
        str(subject),
        token_type="access",
        expires_minutes=settings.access_token_expire_minutes,
    )
    return ok({"access_token": access_token, "token_type": "bearer"}, "Refresh token thanh cong")


# Tra thong tin nguoi dung dang dang nhap.
@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return ok(
        {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "is_verified": current_user.is_verified,
        },
        "Thong tin nguoi dung",
    )
