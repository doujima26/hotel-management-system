from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

# Khoi tao bo bam mat khau bcrypt.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Tao JWT token voi thong tin chu the va thoi han.
def create_token(subject: str, token_type: str, expires_minutes: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        'sub': subject,
        'type': token_type,
        'iat': int(now.timestamp()),
        'exp': int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


# Giai ma va kiem tra token JWT.
def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError('Invalid token') from exc


# Bam mat khau truoc khi luu vao CSDL.
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# Xac minh mat khau dang nhap voi mat khau da bam.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
