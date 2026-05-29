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
