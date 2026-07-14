from datetime import date

from pydantic import BaseModel, EmailStr, Field


# Schema du lieu dau vao cho Admin tao nhan vien moi.
class CreateStaffRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    position: str = Field(min_length=2, max_length=100)
    hired_at: date | None = None


# Schema du lieu dau vao cho Admin cap nhat nhan vien.
class UpdateStaffRequest(BaseModel):
    position: str | None = Field(default=None, min_length=2, max_length=100)
    is_active: bool | None = None
    hired_at: date | None = None


# Schema du lieu tra ve thong tin nhan vien (ghep tu StaffMember + User).
class StaffMemberResponse(BaseModel):
    id: int
    user_id: int
    hotel_id: int
    email: EmailStr
    full_name: str
    phone: str | None = None
    position: str
    is_active: bool
    hired_at: date | None = None


# Schema du lieu tra ve sau khi tao nhan vien, kem mat khau tam (mock, chua gui mail that).
class CreateStaffResponse(StaffMemberResponse):
    temp_password_mock: str
