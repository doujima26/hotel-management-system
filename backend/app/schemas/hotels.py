from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.enums import DiscountType, HotelStatus


# Schema du lieu dau vao cho admin dang ky khach san.
class CreateHotelRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    address: str = Field(min_length=5)
    city: str = Field(min_length=2, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    star_rating: int | None = Field(default=None, ge=1, le=5)


# Schema du lieu dau vao cho tao dich vu khach san.
class CreateHotelServiceRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    price: float = Field(gt=0)
    unit: str | None = Field(default=None, max_length=50)


# Schema du lieu dau vao cho cap nhat dich vu khach san.
class UpdateHotelServiceRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    unit: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


# Schema du lieu dau vao cho tao khuyen mai.
class CreatePromotionRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    discount_type: str = Field(pattern="^(percentage|fixed_amount)$")
    discount_value: float = Field(gt=0)
    min_booking_amount: float | None = Field(default=None, ge=0)
    max_discount_amount: float | None = Field(default=None, ge=0)
    start_date: date
    end_date: date
    usage_limit: int | None = Field(default=None, gt=0)


# Schema du lieu dau vao cho cap nhat khuyen mai.
class UpdatePromotionRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    discount_type: str | None = Field(default=None, pattern="^(percentage|fixed_amount)$")
    discount_value: float | None = Field(default=None, gt=0)
    min_booking_amount: float | None = Field(default=None, ge=0)
    max_discount_amount: float | None = Field(default=None, ge=0)
    start_date: date | None = None
    end_date: date | None = None
    usage_limit: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


# Schema du lieu tra ve thong tin khach san (phia admin quan ly).
class HotelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    city: str
    status: HotelStatus
    rejection_reason: str | None = None


# Schema du lieu tra ve dich vu khach san.
class HotelServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hotel_id: int
    name: str
    description: str | None = None
    price: float
    unit: str | None = None
    is_active: bool


# Schema du lieu tra ve khuyen mai.
class PromotionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hotel_id: int
    name: str
    description: str | None = None
    discount_type: DiscountType
    discount_value: float
    min_booking_amount: float | None = None
    max_discount_amount: float | None = None
    start_date: date
    end_date: date
    usage_limit: int | None = None
    used_count: int
    is_active: bool


# Schema mot khach san trong ket qua tim kiem cong khai.
class HotelSearchItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    city: str
    district: str | None = None
    address: str
    star_rating: int | None = None
    avg_rating: float
    total_reviews: int


# Schema danh sach khach san tim kiem cong khai kem phan trang.
class HotelSearchResponse(BaseModel):
    items: list[HotelSearchItemResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


# Schema du lieu dau vao cho them anh khach san.
class CreateHotelImageRequest(BaseModel):
    image_url: str = Field(min_length=1, max_length=2048)
    is_primary: bool = False


# Schema du lieu tra ve anh khach san.
class HotelImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hotel_id: int
    image_url: str
    is_primary: bool
    sort_order: int


# Schema du lieu tra ve sau khi xoa anh khach san.
class DeleteHotelImageResponse(BaseModel):
    id: int
