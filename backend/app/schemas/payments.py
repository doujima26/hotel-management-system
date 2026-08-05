from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import PaymentMethod, PaymentStatus


# Schema payload webhook SePay bao co giao dich moi. Ten truong theo dung tai
# lieu SePay (camelCase) nen phai khai bao alias, khong doi ten duoc.
# Chi khai bao cac truong he thong dung toi; truong la trong payload van duoc
# giu nguyen trong cot raw_payload.
class SepayWebhookPayload(BaseModel):
    # id giao dich ben SePay, khong doi qua cac lan gui lai.
    id: int
    gateway: str
    transaction_date: str = Field(alias="transactionDate")
    account_number: str = Field(alias="accountNumber")
    # Ma thanh toan SePay boc tach duoc, null khi noi dung khong khop cau hinh.
    code: str | None = None
    content: str
    transfer_type: str = Field(alias="transferType")
    transfer_amount: int = Field(alias="transferAmount")
    reference_code: str | None = Field(default=None, alias="referenceCode")


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
