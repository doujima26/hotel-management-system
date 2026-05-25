from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings

# Khoi tao ung dung FastAPI va nap router API v1.
app = FastAPI(title=settings.app_name)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get('/health')
def health() -> dict:
    # Kiem tra trang thai song cua backend.
    return {'status': 'ok'}
