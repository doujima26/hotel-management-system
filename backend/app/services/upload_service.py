import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

# Duong dan cong khai de truy cap anh da tai len.
UPLOAD_URL_PREFIX = "/uploads"


# Thu muc luu anh, doc tu cau hinh de moi noi trien khai dat duong dan rieng.
def upload_dir() -> Path:
    return Path(settings.upload_dir)

# Cac dinh dang anh cho phep, nhan dien bang chu ky o dau file. Khong dung phan
# mo rong hay content-type do trinh duyet gui len vi ca hai deu do phia goi tu
# dat: doi ten mot file thuc thi thanh .jpg la qua duoc neu chi xet duoi file.
_IMAGE_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
)

# WebP co chu ky tach lam 2 doan: "RIFF" o dau file va "WEBP" o byte thu 8.
_WEBP_PREFIX = b"RIFF"
_WEBP_FORMAT = b"WEBP"

# So byte dau can doc de nhan dien dinh dang (WebP can toi byte thu 12).
_HEADER_SIZE = 12

_CHUNK_SIZE = 64 * 1024


# Nhan dien dinh dang anh tu cac byte dau file, tra ve phan mo rong tuong ung.
# Tra ve None neu khong phai anh thuoc danh sach cho phep - SVG khong nam trong
# danh sach nay vi SVG chay duoc JavaScript.
def detect_image_extension(header: bytes) -> str | None:
    for signature, extension in _IMAGE_SIGNATURES:
        if header.startswith(signature):
            return extension
    if header.startswith(_WEBP_PREFIX) and header[8:12] == _WEBP_FORMAT:
        return ".webp"
    return None


# Luu anh tai len vao thu muc uploads va tra ve duong dan cong khai cua anh.
# Ten file duoc sinh ngau nhien, khong dung ten nguoi dung gui len de tranh ghi
# de file khac qua duong dan kieu "../../".
async def save_uploaded_image(file: UploadFile) -> str:
    header = await file.read(_HEADER_SIZE)
    extension = detect_image_extension(header)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi chap nhan anh dinh dang JPG, PNG, GIF hoac WebP",
        )

    directory = upload_dir()
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / f"{secrets.token_hex(16)}{extension}"

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    written = len(header)
    try:
        with target.open("wb") as output:
            output.write(header)
            while True:
                chunk = await file.read(_CHUNK_SIZE)
                if not chunk:
                    break
                written += len(chunk)
                # Kiem tra trong luc doc chu khong doc het roi moi kiem, de mot
                # file rat lon khong kip chiem het dia.
                if written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Anh vuot qua gioi han {settings.max_upload_size_mb} MB",
                    )
                output.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise

    return f"{UPLOAD_URL_PREFIX}/{target.name}"
