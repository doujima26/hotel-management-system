from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import BookingStatus


# Schema 1 dong yeu cau dat phong theo loai phong va so luong.
class BookingRoomItem(BaseModel):
    room_type_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


# Schema du lieu dau vao cho tao booking.
class CreateBookingRequest(BaseModel):
    hotel_id: int = Field(gt=0)
    check_in_date: date
    check_out_date: date
    num_guests: int = Field(gt=0)
    rooms: list[BookingRoomItem] = Field(min_length=1)
    special_requests: str | None = None


# Schema du lieu dau vao cho huy booking.
class CancelBookingRequest(BaseModel):
    cancellation_reason: str | None = None


# Schema du lieu tra ve 1 dong phong trong booking.
class BookingRoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_type_id: int
    quantity: int
    price_per_night: float
    num_nights: int
    subtotal: float


# Schema du lieu tra ve chi tiet booking.
class BookingResponse(BaseModel):
    id: int
    booking_code: str
    hotel_id: int
    check_in_date: date
    check_out_date: date
    num_guests: int
    total_room_price: float
    total_service_price: float
    discount_amount: float
    total_amount: float
    status: BookingStatus
    special_requests: str | None = None
    cancellation_reason: str | None = None
    cancelled_at: datetime | None = None
    rooms: list[BookingRoomResponse]
