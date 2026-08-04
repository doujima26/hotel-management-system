from fastapi import APIRouter, Depends, File, UploadFile

from app.api.deps import get_current_user
from app.core.response import ok
from app.models.entities import User
from app.services.upload_service import save_uploaded_image

router = APIRouter(prefix="/uploads", tags=["uploads"])


# Nguoi dung da dang nhap tai anh len, dung chung cho anh dai dien, anh khach
# san va anh loai phong - viec luu file giong nhau, chi khac cho gan duong dan
# tra ve vao dau.
@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    url = await save_uploaded_image(file)
    return ok({"url": url}, "Tai anh len thanh cong")
