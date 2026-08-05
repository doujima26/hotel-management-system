from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import BookingStatus, PaymentMethod, PaymentStatus
from app.schemas.payments import InvoiceResponse, PaymentResponse


# Schema 1 dong yeu cau dat phong theo loai phong va so luong.
class BookingRoomItem(BaseModel):
    room_type_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


# Schema 1 dong dich vu them cua booking.
class BookingServiceItem(BaseModel):
    service_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


# Schema du lieu dau vao cho tao booking.
class CreateBookingRequest(BaseModel):
    hotel_id: int = Field(gt=0)
    check_in_date: date
    check_out_date: date
    num_guests: int = Field(gt=0)
    rooms: list[BookingRoomItem] = Field(min_length=1)
    services: list[BookingServiceItem] = []
    special_requests: str | None = None
    promotion_id: int | None = Field(default=None, gt=0)


# Schema du lieu dau vao cho tao booking va thanh toan trong cung 1 giao dich.
# Ke thua CreateBookingRequest va chi them phuong thuc thanh toan.
class CheckoutRequest(CreateBookingRequest):
    payment_method: PaymentMethod


# Schema du lieu dau vao cho huy booking.
class CancelBookingRequest(BaseModel):
    cancellation_reason: str | None = None


# Schema du lieu tra ve 1 dong phong trong booking.
class BookingRoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_type_id: int
    room_type_name: str
    quantity: int
    price_per_night: float
    num_nights: int
    subtotal: float


# Schema du lieu tra ve 1 dong dich vu them trong booking (kem ten dich vu).
class BookingServiceResponse(BaseModel):
    service_id: int
    name: str
    quantity: int
    unit_price: float
    subtotal: float


# Schema du lieu tra ve chi tiet booking.
class BookingResponse(BaseModel):
    id: int
    booking_code: str
    hotel_id: int
    hotel_name: str
    hotel_address: str
    hotel_city: str
    hotel_phone: str | None = None
    customer_name: str
    customer_email: str
    customer_phone: str | None = None
    check_in_date: date
    check_out_date: date
    num_guests: int
    total_room_price: float
    total_service_price: float
    discount_amount: float
    promotion_id: int | None = None
    total_amount: float
    status: BookingStatus
    payment_status: PaymentStatus | None = None
    payment_method: PaymentMethod | None = None
    special_requests: str | None = None
    cancellation_reason: str | None = None
    cancelled_at: datetime | None = None
    rooms: list[BookingRoomResponse]
    services: list[BookingServiceResponse] = []


# Schema thong tin de khach quet ma QR chuyen khoan. Chi co khi chon phuong
# thuc bank_transfer.
class BankTransferResponse(BaseModel):
    # Noi dung chuyen khoan khach phai giu nguyen - chinh la booking_code, SePay
    # boc chuoi nay ra de biet tien cua don nao.
    payment_code: str
    amount: int
    account_number: str
    bank: str
    qr_url: str
    # Moc het han giu phong; qua moc nay don tu huy va phong duoc ban lai.
    expires_at: datetime


# Schema du lieu tra ve cua luong dat phong.
#
# Voi cac phuong thuc thanh toan mock: don, thanh toan va hoa don duoc tao trong
# cung 1 giao dich nen tra ve day du, man hinh hoan tat hien duoc ngay.
#
# Voi bank_transfer: chi co don, kem thong tin QR. Thanh toan va hoa don chi
# sinh ra khi ngan hang bao tien da ve (webhook SePay).
class CheckoutResponse(BaseModel):
    booking: BookingResponse
    payment: PaymentResponse | None = None
    invoice: InvoiceResponse | None = None
    bank_transfer: BankTransferResponse | None = None
