from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'Hotel Management System'
    api_v1_prefix: str = '/api/v1'

    database_url: str = 'postgresql+psycopg2://postgres:postgres@localhost:5432/hotel_db'

    jwt_secret_key: str = 'change_me'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 10080


settings = Settings()
