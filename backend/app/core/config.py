from pydantic_settings import BaseSettings, SettingsConfigDict


# Cau hinh bien moi truong cho backend.
class Settings(BaseSettings):
    # Nap bien moi truong tu file .env.
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # Cau hinh thong tin ung dung va prefix API.
    app_name: str = 'Hotel Management System'
    api_v1_prefix: str = '/api/v1'

    # Chuoi ket noi toi PostgreSQL.
    database_url: str = 'postgresql+psycopg2://postgres:26122004@localhost:5433/hotel_booking_DB'

    # Cau hinh JWT cho access token va refresh token.
    jwt_secret_key: str = 'change_me'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080

    # Mui gio nghiep vu, tinh theo so gio lech so voi UTC (mac dinh +7 = gio Viet
    # Nam). Dung de xac dinh "1 ngay" khi thong ke doanh thu - khong phu thuoc
    # mui gio cua may chu. Dung offset co dinh vi Viet Nam khong co gio mua he.
    business_timezone_offset_hours: int = 7


# Khoi tao doi tuong settings dung chung toan he thong.
settings = Settings()
