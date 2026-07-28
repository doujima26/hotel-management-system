from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import PaymentMethod, PaymentStatus


# Schema du lieu dau vao cho thanh toan booking.
class PayBookingRequest(BaseModel):
    booking_id: int = Field(gt=0)
    payment_method: PaymentMethod


# Schema du lieu tra ve thong tin thanh toan.
class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    amount: float
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    transaction_id: str | None = None
    paid_at: datetime | None = None


# Schema du lieu tra ve hoa don.
class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    booking_id: int
    payment_id: int
    buyer_name: str
    buyer_email: str
    buyer_phone: str | None = None
    seller_name: str
    seller_address: str
    seller_phone: str | None = None
    seller_email: str | None = None
    total_room_price: float
    total_service_price: float
    discount_amount: float
    total_amount: float
    issued_at: datetime


# Schema du lieu tra ve sau khi thanh toan thanh cong, kem hoa don.
class PayBookingResponse(BaseModel):
    payment: PaymentResponse
    invoice: InvoiceResponse
