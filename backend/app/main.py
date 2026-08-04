from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.response import ok
from app.services.upload_service import UPLOAD_URL_PREFIX, upload_dir

# Khoi tao ung dung FastAPI va nap router API v1.
app = FastAPI(title=settings.app_name)
app.include_router(api_router, prefix=settings.api_v1_prefix)
register_exception_handlers(app)

# Phuc vu anh nguoi dung da tai len. Tao san thu muc vi StaticFiles bao loi khi
# thu muc chua ton tai o lan chay dau.
_upload_dir = upload_dir()
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount(UPLOAD_URL_PREFIX, StaticFiles(directory=_upload_dir), name="uploads")


@app.get('/health')
def health():
    # Kiem tra trang thai song cua backend.
    return ok({'status': 'ok'}, 'Backend dang hoat dong')
