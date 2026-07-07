from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.response import ok

# Khoi tao ung dung FastAPI va nap router API v1.
app = FastAPI(title=settings.app_name)
app.include_router(api_router, prefix=settings.api_v1_prefix)
register_exception_handlers(app)


@app.get('/health')
def health():
    # Kiem tra trang thai song cua backend.
    return ok({'status': 'ok'}, 'Backend dang hoat dong')
