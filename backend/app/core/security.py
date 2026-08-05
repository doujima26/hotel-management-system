import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

# Khoi tao bo bam mat khau bcrypt.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Tao JWT token voi thong tin chu the, thoi han va phien ban token (claim "ver").
# "ver" dung de thu hoi phien: khi doi mat khau, users.token_version tang len nen
# moi token cu deu lech "ver" va bi tu choi.
def create_token(subject: str, token_type: str, expires_minutes: int, token_version: int = 0) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        'sub': subject,
        'type': token_type,
        'ver': token_version,
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


# Xac minh chu ky HMAC-SHA256 cua webhook SePay. SePay ky tren chuoi
# "<timestamp>.<raw_body>" va gui ket qua dang "sha256=<hex>" trong header
# X-SePay-Signature.
#
# raw_body phai la chuoi byte GOC cua request. Phan tich JSON roi tao lai chuoi
# se ra byte khac (khac dau cach, thu tu khoa, cach escape) va chu ky khong bao
# gio khop.
#
# Tra ve (hop le, ly do). Ly do dung de ghi log, khong tra ra ngoai cho nguoi
# goi biet minh sai o dau.
def verify_sepay_signature(raw_body: bytes, signature: str, timestamp: str) -> tuple[bool, str]:
    if not settings.sepay_webhook_secret:
        return False, "chua cau hinh SEPAY_WEBHOOK_SECRET"
    if not signature or not timestamp:
        return False, "thieu header chu ky hoac dau thoi gian"

    # Dau thoi gian cu hon nguong cho phep thi tu choi, de goi tin bi bat lai
    # khong dung lai duoc mai mai. Chong phat lai chinh van vay bang khoa UNIQUE
    # tren sepay_id; day la lop thu hai.
    try:
        lech = abs(time.time() - int(timestamp))
    except ValueError:
        return False, "dau thoi gian khong phai so"
    if lech > settings.sepay_timestamp_tolerance_seconds:
        return False, f"dau thoi gian lech {lech:.0f} giay"

    ky_tren = timestamp.encode() + b"." + raw_body
    mong_doi = "sha256=" + hmac.new(
        settings.sepay_webhook_secret.encode(), ky_tren, hashlib.sha256
    ).hexdigest()

    # compare_digest so sanh trong thoi gian co dinh. So sanh bang "==" dung lai
    # ngay ky tu dau khac nhau, thoi gian phan hoi ro ri thong tin du de do dan
    # ra chu ky dung.
    if not hmac.compare_digest(mong_doi, signature):
        return False, "chu ky khong khop"
    return True, ""
