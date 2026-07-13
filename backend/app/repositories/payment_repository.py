from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.enums import PaymentMethod, PaymentStatus
from app.models.entities import Invoice, Payment


# Tao payment moi (mock, luon thanh cong). Khong commit ngay, giu trong cung
# transaction voi invoice va cap nhat trang thai booking.
def create_payment_record(
    db: Session,
    *,
    booking_id: int,
    amount: float,
    payment_method: PaymentMethod,
    transaction_id: str,
) -> Payment:
    payment = Payment(
        booking_id=booking_id,
        amount=amount,
        payment_method=payment_method,
        payment_status=PaymentStatus.COMPLETED,
        transaction_id=transaction_id,
        payment_gateway_response={"mock": True, "provider": payment_method.value},
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    db.flush()
    return payment


# Tao invoice moi. Khong commit ngay, xem create_payment_record.
def create_invoice_record(
    db: Session,
    *,
    invoice_number: str,
    booking_id: int,
    payment_id: int,
    user_id: int,
    hotel_id: int,
    total_room_price: float,
    total_service_price: float,
    discount_amount: float,
    total_amount: float,
) -> Invoice:
    invoice = Invoice(
        invoice_number=invoice_number,
        booking_id=booking_id,
        payment_id=payment_id,
        user_id=user_id,
        hotel_id=hotel_id,
        total_room_price=total_room_price,
        total_service_price=total_service_price,
        discount_amount=discount_amount,
        total_amount=total_amount,
    )
    db.add(invoice)
    db.flush()
    return invoice


# Lay payment theo id.
def get_payment_by_id(db: Session, payment_id: int) -> Payment | None:
    return db.query(Payment).filter(Payment.id == payment_id).first()


# Lay payment theo booking_id.
def get_payment_by_booking_id(db: Session, booking_id: int) -> Payment | None:
    return db.query(Payment).filter(Payment.booking_id == booking_id).first()


# Lay invoice theo booking_id.
def get_invoice_by_booking_id(db: Session, booking_id: int) -> Invoice | None:
    return db.query(Invoice).filter(Invoice.booking_id == booking_id).first()
