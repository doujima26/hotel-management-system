import re

# Cac ky tu trang tri nguoi dung hay go xen vao so dien thoai.
_PHONE_SEPARATORS = re.compile(r"[\s.\-()]")

# So dien thoai sau khi bo ky tu trang tri: tuy chon dau +, roi 9 den 11 chu so.
# Khoang nay bao duoc ca so noi dia (0912345678) lan dang quoc te (+84912345678).
_PHONE_PATTERN = re.compile(r"^\+?\d{9,11}$")


# Chuan hoa va kiem tra so dien thoai. Nem ValueError de Pydantic chuyen thanh
# loi 422 kem thong bao tieng Viet.
def validate_phone(value: str) -> str:
    cleaned = _PHONE_SEPARATORS.sub("", value or "")
    if not cleaned:
        raise ValueError("Vui long nhap so dien thoai")
    if not _PHONE_PATTERN.match(cleaned):
        raise ValueError("So dien thoai khong hop le, can 9 den 11 chu so")
    return cleaned
