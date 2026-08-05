from pydantic import BaseModel, Field, field_validator

from app.core.validators import validate_phone


# Schema du lieu dau vao cho nguoi dung tu cap nhat ho so cua minh. Cac truong
# deu tuy chon vi day la cap nhat tung phan, nhung da gui thi phai hop le -
# rieng so dien thoai khong duoc xoa trong sau khi da dang ky.
class UpdateUserRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    avatar_url: str | None = Field(default=None, max_length=2048)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_phone(value)
