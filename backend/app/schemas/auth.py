from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import UserRole


# Schema du lieu dau vao cho dang ky.
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole = UserRole.USER


# Schema du lieu dau vao cho dang nhap.
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


# Schema du lieu dau vao cho refresh token.
class RefreshTokenRequest(BaseModel):
    refresh_token: str


# Schema du lieu dau vao cho doi mat khau.
class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Schema du lieu dau vao cho quen mat khau.
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# Schema du lieu dau vao cho dat lai mat khau bang OTP.
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


# Schema du lieu dau vao cho gui OTP xac thuc tai khoan.
class SendVerifyOtpRequest(BaseModel):
    email: EmailStr


# Schema du lieu dau vao cho xac thuc tai khoan bang OTP.
class VerifyAccountRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


# Schema du lieu dau vao cho khoa mo tai khoan nguoi dung.
class SetUserActiveRequest(BaseModel):
    is_active: bool


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


# Schema du lieu dau vao cho super admin duyet khach san.
class ReviewHotelRequest(BaseModel):
    action: str = Field(pattern="^(approved|rejected|suspended)$")
    rejection_reason: str | None = None


# Schema du lieu dau vao cho tao loai phong.
class CreateRoomTypeRequest(BaseModel):
    hotel_id: int = Field(gt=0)
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    base_price: float = Field(gt=0)
    max_guests: int = Field(gt=0)
    area_sqm: float | None = Field(default=None, gt=0)
    bed_type: str | None = Field(default=None, max_length=100)
    total_rooms: int = Field(gt=0)


# Schema du lieu dau vao cho tao phong vat ly.
class CreateRoomRequest(BaseModel):
    room_type_id: int = Field(gt=0)
    room_number: str = Field(min_length=1, max_length=20)
    floor: int | None = None


# Schema du lieu dau vao cho tao tien nghi.
class CreateAmenityRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    icon: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=50)
