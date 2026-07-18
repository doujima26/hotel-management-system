from pydantic import BaseModel, Field


# Schema du lieu dau vao cho nguoi dung tu cap nhat ho so cua minh.
class UpdateUserRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    avatar_url: str | None = Field(default=None, max_length=2048)
