from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import RoomStatus


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


# Schema du lieu tra ve loai phong.
class RoomTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hotel_id: int
    name: str
    base_price: float
    max_guests: int
    total_rooms: int
    is_active: bool


# Schema du lieu tra ve phong vat ly.
class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_type_id: int
    room_number: str
    floor: int | None = None
    status: RoomStatus
    is_active: bool


# Schema danh sach phong vat ly kem thong tin so luong.
class RoomListResponse(BaseModel):
    items: list[RoomResponse]
    current_rooms: int
    max_rooms: int
    remaining_rooms: int


# Schema du lieu tra ve tien nghi.
class AmenityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hotel_id: int
    name: str
    icon: str | None = None
    category: str | None = None


# Schema du lieu tra ve sau khi gan tien nghi vao loai phong.
class RoomTypeAmenityLinkResponse(BaseModel):
    room_type_id: int
    amenity_id: int


# Schema tinh trang trong cua mot loai phong theo khoang ngay.
class RoomTypeAvailabilityResponse(BaseModel):
    room_type_id: int
    name: str
    base_price: float
    max_guests: int
    total_rooms: int
    available_rooms: int


# Schema ket qua tra cuu phong trong cua mot khach san theo khoang ngay.
class RoomAvailabilityResponse(BaseModel):
    hotel_id: int
    check_in: date
    check_out: date
    items: list[RoomTypeAvailabilityResponse]
