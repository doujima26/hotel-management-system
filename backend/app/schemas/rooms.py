from pydantic import BaseModel, Field


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
