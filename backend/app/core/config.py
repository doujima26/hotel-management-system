from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Thu muc goc du an, len 3 cap tu backend/app/core/config.py. Neo vao vi tri file
# thay vi thu muc dang chay lenh, de .env luon duoc tim thay du khoi dong backend
# tu thu muc nao.
_PROJECT_ROOT = Path(__file__).resolve().parents[3]


# Cau hinh bien moi truong cho backend.
class Settings(BaseSettings):
    # Nap bien moi truong tu file .env o thu muc goc du an.
    model_config = SettingsConfigDict(
        env_file=_PROJECT_ROOT / '.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    # Cau hinh thong tin ung dung va prefix API.
    app_name: str = 'Hotel Management System'
    api_v1_prefix: str = '/api/v1'

    # Chuoi ket noi toi PostgreSQL. Gia tri o day chi la mac dinh vo hai de du an
    # clone ve chay duoc; chuoi that co mat khau thuc dat trong .env qua bien
    # DATABASE_URL va khong bao gio commit.
    database_url: str = 'postgresql+psycopg2://postgres:postgres@localhost:5433/hotel_booking_DB'

    # Cau hinh JWT cho access token va refresh token.
    jwt_secret_key: str = 'change_me'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080

    # Thu muc luu anh nguoi dung tai len, tinh tu thu muc chay backend. Anh
    # duoc phuc vu lai qua duong dan /uploads.
    upload_dir: str = 'uploads'

    # Gioi han dung luong moi anh tai len.
    max_upload_size_mb: int = 5

    # Cau hinh may chu gui mail (Gmail SMTP). De trong nghia la chua cau hinh:
    # he thong se ghi noi dung mail ra log thay vi gui, de moi truong phat trien
    # van chay duoc ma khong can tai khoan that.
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_username: str = ''
    smtp_password: str = ''
    smtp_from: str = 'Hotel Booking'

    # Google hien thi App Password thanh 4 nhom cach nhau bang dau cach cho de
    # doc; mat khau that khong co dau cach nen bo di truoc khi dang nhap SMTP.
    @field_validator('smtp_password')
    @classmethod
    def _bo_dau_cach_app_password(cls, value: str) -> str:
        return value.replace(' ', '')

    # Mui gio nghiep vu, tinh theo so gio lech so voi UTC (mac dinh +7 = gio Viet
    # Nam). Dung de xac dinh "1 ngay" khi thong ke doanh thu - khong phu thuoc
    # mui gio cua may chu. Dung offset co dinh vi Viet Nam khong co gio mua he.
    business_timezone_offset_hours: int = 7


# Khoi tao doi tuong settings dung chung toan he thong.
settings = Settings()
