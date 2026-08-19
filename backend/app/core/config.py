from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Thu muc goc du an, len 3 cap tu backend/app/core/config.py.
_PROJECT_ROOT = Path(__file__).resolve().parents[3]


# Cau hinh bien moi truong cho backend.
class Settings(BaseSettings):
    # Nap bien moi truong tu file .env o thu muc goc du an.
    model_config = SettingsConfigDict(
        env_file=_PROJECT_ROOT / '.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    # Thong tin ung dung va prefix API.
    app_name: str = 'Hotel Management System'
    api_v1_prefix: str = '/api/v1'

    # Chuoi ket noi PostgreSQL, dat that qua bien moi truong DATABASE_URL.
    database_url: str = 'postgresql+psycopg2://postgres:postgres@localhost:5433/hotel_booking_DB'

    # Chuoi ket noi PostgreSQL danh rieng cho bo kiem thu tich hop.
    test_database_url: str = 'postgresql+psycopg2://postgres:postgres@localhost:5433/hotel_booking_test'

    # Cau hinh JWT cho access token va refresh token.
    jwt_secret_key: str = 'change_me'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 15
    refresh_token_expire_minutes: int = 10080

    # Thu muc luu anh tai len, tinh tu thu muc chay backend.
    upload_dir: str = 'uploads'

    # Gioi han dung luong moi anh tai len.
    max_upload_size_mb: int = 5

    # Cau hinh may chu gui mail qua Gmail SMTP. De trong thi ghi noi dung mail
    # ra log thay vi gui.
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_username: str = ''
    smtp_password: str = ''
    smtp_from: str = 'Hotel Booking'

    # Bo dau cach trong App Password truoc khi dang nhap SMTP.
    @field_validator('smtp_password')
    @classmethod
    def _bo_dau_cach_app_password(cls, value: str) -> str:
        return value.replace(' ', '')

    # Mui gio nghiep vu, tinh bang so gio lech so voi UTC. Dung de xac dinh
    # mot ngay khi thong ke.
    business_timezone_offset_hours: int = 7

    # Cau hinh SePay cho thanh toan chuyen khoan. De trong secret thi endpoint
    # webhook tu choi moi request.
    sepay_webhook_secret: str = ''
    # So tai khoan va ma ngan hang dung de sinh ma QR.
    sepay_account_number: str = ''
    sepay_bank: str = ''
    # Dia chi dich vu sinh anh QR cua SePay.
    sepay_qr_base_url: str = 'https://qr.sepay.vn/img'
    # So phut giu phong cho khach chuyen khoan. Qua han thi don tu huy.
    sepay_hold_minutes: int = 15
    # Do lech toi da cho phep cua dau thoi gian webhook, tinh bang giay.
    sepay_timestamp_tolerance_seconds: int = 300


# Doi tuong settings dung chung toan he thong.
settings = Settings()
