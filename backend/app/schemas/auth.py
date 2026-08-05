from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.enums import UserRole
from app.core.validators import validate_phone


# Schema du lieu dau vao cho dang ky.
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(max_length=20)
    role: UserRole = UserRole.USER

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str) -> str:
        return validate_phone(value)


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


# Schema du lieu tra ve thong tin co ban cua nguoi dung.
# Luu y: email dung str (khong dung EmailStr) vi day la schema DOC lai du lieu da luu san
# trong DB, khong phai validate du lieu dau vao - EmailStr se bi loi 500 voi domain khong
# the nhan mail that (vd du lieu seed dang ".local").
class UserPublicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    phone: str | None = None
    avatar_url: str | None = None
    role: UserRole
    is_active: bool
    is_verified: bool


# Schema du lieu tra ve sau khi dang ky tai khoan (kem OTP mock de test).
class RegisterResponse(UserPublicResponse):
    otp_mock: str


# Schema thong tin nguoi dung rut gon kem trong ket qua dang nhap.
class LoginUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: UserRole


# Schema du lieu tra ve sau khi dang nhap thanh cong.
class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: LoginUserResponse


# Schema du lieu tra ve sau khi lam moi access token.
class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str


# Schema du lieu tra ve sau khi doi mat khau.
class ChangePasswordResponse(BaseModel):
    user_id: int


# Schema du lieu tra ve cho luong quen mat khau.
class ForgotPasswordResponse(BaseModel):
    email: EmailStr
    otp_mock: str | None = None


# Schema du lieu tra ve sau khi dat lai mat khau.
class ResetPasswordResponse(BaseModel):
    user_id: int


# Schema du lieu tra ve cho luong gui OTP xac thuc tai khoan.
class SendVerifyOtpResponse(BaseModel):
    email: EmailStr
    otp_mock: str | None = None
    is_verified: bool | None = None


# Schema du lieu tra ve sau khi xac thuc tai khoan.
class VerifyAccountResponse(BaseModel):
    user_id: int
    is_verified: bool
