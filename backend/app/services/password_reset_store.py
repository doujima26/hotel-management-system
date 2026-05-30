from datetime import datetime, timedelta, timezone
from threading import Lock


# Luu OTP tam thoi trong bo nho theo email va muc dich.
_otp_store: dict[str, dict[str, datetime | str]] = {}
_otp_lock = Lock()


# Tao va luu OTP moi theo email voi thoi han.
def create_otp(email: str, otp: str, expires_minutes: int = 10, purpose: str = "reset") -> None:
    normalized_key = f"{purpose}:{email.lower().strip()}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    with _otp_lock:
        _otp_store[normalized_key] = {"otp": otp, "expires_at": expires_at}


# Kiem tra OTP hop le theo email va thoi han.
def verify_otp(email: str, otp: str, purpose: str = "reset") -> bool:
    normalized_key = f"{purpose}:{email.lower().strip()}"
    with _otp_lock:
        item = _otp_store.get(normalized_key)
        if not item:
            return False

        if datetime.now(timezone.utc) > item["expires_at"]:
            _otp_store.pop(normalized_key, None)
            return False

        return item["otp"] == otp


# Xoa OTP sau khi xu ly thanh cong.
def delete_otp(email: str, purpose: str = "reset") -> None:
    normalized_key = f"{purpose}:{email.lower().strip()}"
    with _otp_lock:
        _otp_store.pop(normalized_key, None)
