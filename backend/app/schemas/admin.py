from pydantic import BaseModel, EmailStr, Field

from app.core.enums import HotelStatus
from app.schemas.auth import UserPublicResponse
from app.schemas.hotels import HotelResponse


# Schema du lieu dau vao cho khoa mo tai khoan nguoi dung.
class SetUserActiveRequest(BaseModel):
    is_active: bool


# Schema du lieu dau vao cho super admin duyet khach san.
class ReviewHotelRequest(BaseModel):
    action: str = Field(pattern="^(approved|rejected|suspended)$")
    rejection_reason: str | None = None


# Schema du lieu tra ve sau khi khoa mo tai khoan nguoi dung.
class SetUserActiveResponse(BaseModel):
    user_id: int
    email: EmailStr
    is_active: bool


# Schema du lieu tra ve sau khi duyet tu choi hoac tam dung khach san.
class ReviewHotelResponse(BaseModel):
    id: int
    status: HotelStatus
    rejection_reason: str | None = None


# Schema danh sach khach san cho super admin duyet, kem phan trang.
class AdminHotelListResponse(BaseModel):
    items: list[HotelResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


# Schema danh sach nguoi dung cho super admin quan ly, kem phan trang.
class AdminUserListResponse(BaseModel):
    items: list[UserPublicResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
