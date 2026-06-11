from datetime import date

from pydantic import BaseModel, EmailStr, Field


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
