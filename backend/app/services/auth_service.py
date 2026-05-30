import secrets

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_token, hash_password, verify_password
from app.repositories.user_repository import create_user, get_user_by_email, get_user_by_id
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SendVerifyOtpRequest,
    VerifyAccountRequest,
)
from app.services.password_reset_store import create_otp, delete_otp, verify_otp


# Xu ly nghiep vu dang ky tai khoan.
def register_user(db: Session, payload: RegisterRequest):
    existing = get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email da ton tai",
        )

    user = create_user(
        db,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role.value,
        is_active=True,
        is_verified=False,
    )
    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    create_otp(payload.email, otp_code, expires_minutes=10, purpose="verify")
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "otp_mock": otp_code,
    }


# Xu ly nghiep vu dang nhap va cap token.
def login_user(db: Session, payload: LoginRequest):
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoac mat khau khong dung",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tai khoan da bi khoa",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tai khoan chua xac thuc. Vui long xac thuc OTP truoc khi dang nhap",
        )

    access_token = create_token(
        str(user.id),
        token_type="access",
        expires_minutes=settings.access_token_expire_minutes,
    )
    refresh_token = create_token(
        str(user.id),
        token_type="refresh",
        expires_minutes=settings.refresh_token_expire_minutes,
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


# Xu ly nghiep vu doi mat khau cho nguoi dung dang dang nhap.
def change_password(db: Session, user_id: int, payload: ChangePasswordRequest):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nguoi dung khong ton tai",
        )

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau hien tai khong dung",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau moi phai khac mat khau hien tai",
        )

    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()

    return {"user_id": user.id}


# Tao OTP mock cho luong quen mat khau.
def forgot_password(db: Session, payload: ForgotPasswordRequest):
    user = get_user_by_email(db, payload.email)
    if not user:
        return {"email": payload.email, "otp_mock": None}

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    create_otp(payload.email, otp_code, expires_minutes=10, purpose="reset")
    return {"email": payload.email, "otp_mock": otp_code}


# Dat lai mat khau bang OTP da cap.
def reset_password(db: Session, payload: ResetPasswordRequest):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nguoi dung khong ton tai",
        )

    if not verify_otp(payload.email, payload.otp, purpose="reset"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP khong hop le hoac da het han",
        )

    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau moi phai khac mat khau hien tai",
        )

    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    delete_otp(payload.email, purpose="reset")

    return {"user_id": user.id}


# Tao OTP mock cho luong xac thuc tai khoan sau dang ky.
def send_verify_otp(db: Session, payload: SendVerifyOtpRequest):
    user = get_user_by_email(db, payload.email)
    if not user:
        return {"email": payload.email, "otp_mock": None}

    if user.is_verified:
        return {"email": payload.email, "otp_mock": None, "is_verified": True}

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    create_otp(payload.email, otp_code, expires_minutes=10, purpose="verify")
    return {"email": payload.email, "otp_mock": otp_code, "is_verified": False}


# Xac thuc tai khoan va cap nhat is_verified khi OTP hop le.
def verify_account(db: Session, payload: VerifyAccountRequest):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nguoi dung khong ton tai",
        )

    if user.is_verified:
        return {"user_id": user.id, "is_verified": True}

    if not verify_otp(payload.email, payload.otp, purpose="verify"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP khong hop le hoac da het han",
        )

    user.is_verified = True
    db.add(user)
    db.commit()
    delete_otp(payload.email, purpose="verify")

    return {"user_id": user.id, "is_verified": user.is_verified}
