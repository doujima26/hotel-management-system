from datetime import datetime, timedelta, timezone
from threading import Lock


# Luu OTP reset mat khau tam thoi trong bo nho.
_otp_store: dict[str, dict[str, datetime | str]] = {}
_otp_lock = Lock()


# Tao va luu OTP moi theo email voi thoi han.
def create_otp(email: str, otp: str, expires_minutes: int = 10) -> None:
    normalized_email = email.lower().strip()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    with _otp_lock:
        _otp_store[normalized_email] = {"otp": otp, "expires_at": expires_at}


# Kiem tra OTP hop le theo email va thoi han.
def verify_otp(email: str, otp: str) -> bool:
    normalized_email = email.lower().strip()
    with _otp_lock:
        item = _otp_store.get(normalized_email)
        if not item:
            return False

        if datetime.now(timezone.utc) > item["expires_at"]:
            _otp_store.pop(normalized_email, None)
            return False

        return item["otp"] == otp


# Xoa OTP sau khi reset mat khau thanh cong.
def delete_otp(email: str) -> None:
    normalized_email = email.lower().strip()
    with _otp_lock:
        _otp_store.pop(normalized_email, None)
