import secrets

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_token, hash_password, verify_password
from app.repositories.user_repository import create_user, get_user_by_email, get_user_by_id
from app.schemas.admin import SetUserActiveRequest, SetUserActiveResponse
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    LoginUserResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    SendVerifyOtpRequest,
    SendVerifyOtpResponse,
    UserPublicResponse,
    VerifyAccountRequest,
    VerifyAccountResponse,
)
from app.services.email_service import (
    is_email_configured,
    queue_email,
    send_account_verify_otp,
    send_password_reset_otp,
)
from app.services.password_reset_store import create_otp, delete_otp, verify_otp

# So phut hieu luc cua OTP.
_OTP_EXPIRES_MINUTES = 10


# Tra ve OTP kem trong response chi khi chua cau hinh SMTP. Da gui duoc mail thi
# phai giau di, neu khong bat ky ai cung goi duoc endpoint voi email nguoi khac
# de lay ma dat lai mat khau cua ho.
def _otp_tra_ve(otp_code: str) -> str | None:
    return None if is_email_configured() else otp_code


# Xu ly nghiep vu dang ky tai khoan.
def register_user(db: Session, payload: RegisterRequest, background_tasks: BackgroundTasks | None = None):
    existing = get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã tồn tại",
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
    create_otp(payload.email, otp_code, expires_minutes=_OTP_EXPIRES_MINUTES, purpose="verify")
    queue_email(background_tasks, send_account_verify_otp, payload.email, otp_code, _OTP_EXPIRES_MINUTES)
    user_data = UserPublicResponse.model_validate(user).model_dump()
    return RegisterResponse(**user_data, otp_mock=_otp_tra_ve(otp_code)).model_dump(mode="json")


# Xu ly nghiep vu dang nhap va cap token.
def login_user(db: Session, payload: LoginRequest):
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khóa",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chưa xác thực. Vui lòng xác thực OTP trước khi đăng nhập",
        )

    access_token = create_token(
        str(user.id),
        token_type="access",
        expires_minutes=settings.access_token_expire_minutes,
        token_version=user.token_version,
    )
    refresh_token = create_token(
        str(user.id),
        token_type="refresh",
        expires_minutes=settings.refresh_token_expire_minutes,
        token_version=user.token_version,
    )
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=LoginUserResponse.model_validate(user),
    ).model_dump(mode="json")


# Xu ly nghiep vu doi mat khau cho nguoi dung dang dang nhap.
def change_password(db: Session, user_id: int, payload: ChangePasswordRequest):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại",
        )

    # Tang token_version de thu hoi TOAN BO phien dang nhap (access + refresh)
    # tren moi thiet bi, ke ca thiet bi vua doi mat khau - buoc dang nhap lai.
    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1
    db.add(user)
    db.commit()

    return ChangePasswordResponse(user_id=user.id).model_dump(mode="json")


# Tao OTP cho luong quen mat khau va gui qua email.
def forgot_password(db: Session, payload: ForgotPasswordRequest, background_tasks: BackgroundTasks | None = None):
    user = get_user_by_email(db, payload.email)
    if not user:
        return ForgotPasswordResponse(email=payload.email, otp_mock=None).model_dump(mode="json")

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    create_otp(payload.email, otp_code, expires_minutes=_OTP_EXPIRES_MINUTES, purpose="reset")
    queue_email(background_tasks, send_password_reset_otp, payload.email, otp_code, _OTP_EXPIRES_MINUTES)
    return ForgotPasswordResponse(email=payload.email, otp_mock=_otp_tra_ve(otp_code)).model_dump(mode="json")


# Dat lai mat khau bang OTP da cap.
def reset_password(db: Session, payload: ResetPasswordRequest):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    if not verify_otp(payload.email, payload.otp, purpose="reset"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP không hợp lệ hoặc đã hết hạn",
        )

    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại",
        )

    # Dat lai mat khau qua OTP cung phai thu hoi moi phien cu (tranh ke chiem
    # tai khoan van giu duoc phien sau khi chu tai khoan lay lai mat khau).
    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1
    db.add(user)
    db.commit()
    delete_otp(payload.email, purpose="reset")

    return ResetPasswordResponse(user_id=user.id).model_dump(mode="json")


# Tao OTP cho luong xac thuc tai khoan sau dang ky va gui qua email.
def send_verify_otp(db: Session, payload: SendVerifyOtpRequest, background_tasks: BackgroundTasks | None = None):
    user = get_user_by_email(db, payload.email)
    if not user:
        return SendVerifyOtpResponse(email=payload.email, otp_mock=None).model_dump(mode="json")

    if user.is_verified:
        return SendVerifyOtpResponse(email=payload.email, otp_mock=None, is_verified=True).model_dump(mode="json")

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    create_otp(payload.email, otp_code, expires_minutes=_OTP_EXPIRES_MINUTES, purpose="verify")
    queue_email(background_tasks, send_account_verify_otp, payload.email, otp_code, _OTP_EXPIRES_MINUTES)
    return SendVerifyOtpResponse(
        email=payload.email, otp_mock=_otp_tra_ve(otp_code), is_verified=False
    ).model_dump(mode="json")


# Xac thuc tai khoan va cap nhat is_verified khi OTP hop le.
def verify_account(db: Session, payload: VerifyAccountRequest):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    if user.is_verified:
        return VerifyAccountResponse(user_id=user.id, is_verified=True).model_dump(mode="json")

    if not verify_otp(payload.email, payload.otp, purpose="verify"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP không hợp lệ hoặc đã hết hạn",
        )

    user.is_verified = True
    db.add(user)
    db.commit()
    delete_otp(payload.email, purpose="verify")

    return VerifyAccountResponse(user_id=user.id, is_verified=user.is_verified).model_dump(mode="json")


# Khoa hoac mo tai khoan nguoi dung boi super admin.
def set_user_active(db: Session, user_id: int, payload: SetUserActiveRequest):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    user.is_active = payload.is_active
    db.add(user)
    db.commit()

    return SetUserActiveResponse(
        user_id=user.id,
        email=user.email,
        is_active=user.is_active,
    ).model_dump(mode="json")
