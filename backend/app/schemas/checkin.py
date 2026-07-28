from datetime import date

from pydantic import BaseModel, Field

from app.core.enums import RoomStatus


# Schema 1 phong trong so do phong, kem thong tin khach dang o neu co.
class RoomStatusItemResponse(BaseModel):
    room_id: int
    room_number: str
    floor: int | None = None
    room_type_id: int
    room_type_name: str
    status: RoomStatus
    current_booking_code: str | None = None
    expected_check_out: date | None = None
    # Phong co the dang bi khoa lich (room_blocks) dung hom nay du status van
    # la AVAILABLE - day la thong tin rieng, khong phai 1 gia tri cua RoomStatus.
    is_blocked: bool = False
    block_reason: str | None = None


# Schema 1 dong gan phong vat ly cho 1 dong booking_room cu the (co the gan
# nhieu phong neu quantity > 1).
class RoomAssignmentItem(BaseModel):
    booking_room_id: int = Field(gt=0)
    room_ids: list[int] = Field(min_length=1)


# Schema du lieu dau vao cho check-in 1 booking.
class CheckInRequest(BaseModel):
    assignments: list[RoomAssignmentItem] = Field(min_length=1)
    notes: str | None = None


# Schema du lieu dau vao cho check-out 1 booking.
class CheckOutRequest(BaseModel):
    notes: str | None = None


# Schema du lieu dau vao cho dat 1 phong vao trang thai bao tri.
class SetRoomMaintenanceRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
