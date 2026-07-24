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


# Schema du lieu dau vao cho sua loai phong (tat ca field tuy chon).
class UpdateRoomTypeRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    base_price: float | None = Field(default=None, gt=0)
    max_guests: int | None = Field(default=None, gt=0)
    area_sqm: float | None = Field(default=None, gt=0)
    bed_type: str | None = Field(default=None, max_length=100)
    total_rooms: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


# Schema du lieu dau vao cho tao phong vat ly.
class CreateRoomRequest(BaseModel):
    room_type_id: int = Field(gt=0)
    room_number: str = Field(min_length=1, max_length=20)
    floor: int | None = None


# Schema du lieu dau vao cho sua phong vat ly (tat ca field tuy chon).
# Khong cho sua "status" qua day - trang thai phong quan ly rieng qua luong
# check-in/check-out (co ghi room_status_logs), tranh bo qua audit trail.
class UpdateRoomRequest(BaseModel):
    room_number: str | None = Field(default=None, min_length=1, max_length=20)
    floor: int | None = None
    is_active: bool | None = None


# Schema du lieu dau vao cho tao tien nghi.
class CreateAmenityRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    icon: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=50)


# Schema du lieu dau vao cho sua tien nghi (tat ca field tuy chon).
class UpdateAmenityRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    icon: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=50)


# Schema du lieu tra ve sau khi xoa loai phong.
class DeleteRoomTypeResponse(BaseModel):
    id: int


# Schema du lieu tra ve sau khi xoa phong vat ly.
class DeleteRoomResponse(BaseModel):
    id: int


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


# Schema du lieu tra ve sau khi gan/go tien nghi khoi loai phong.
class RoomTypeAmenityLinkResponse(BaseModel):
    room_type_id: int
    amenity_id: int


# Schema du lieu tra ve sau khi xoa tien nghi.
class DeleteAmenityResponse(BaseModel):
    id: int


# Schema tinh trang trong cua mot loai phong theo khoang ngay.
class RoomTypeAvailabilityResponse(BaseModel):
    room_type_id: int
    name: str
    base_price: float
    max_guests: int
    bed_type: str | None = None
    area_sqm: float | None = None
    total_rooms: int
    available_rooms: int


# Schema ket qua tra cuu phong trong cua mot khach san theo khoang ngay.
class RoomAvailabilityResponse(BaseModel):
    hotel_id: int
    check_in: date
    check_out: date
    items: list[RoomTypeAvailabilityResponse]


# Schema du lieu dau vao cho them anh loai phong.
class CreateRoomTypeImageRequest(BaseModel):
    image_url: str = Field(min_length=1, max_length=2048)
    is_primary: bool = False


# Schema du lieu tra ve anh loai phong.
class RoomTypeImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_type_id: int
    image_url: str
    is_primary: bool
    sort_order: int


# Schema du lieu tra ve sau khi xoa anh loai phong.
class DeleteRoomTypeImageResponse(BaseModel):
    id: int
