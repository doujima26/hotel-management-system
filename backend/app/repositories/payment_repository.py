from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.enums import PaymentMethod, PaymentStatus
from app.models.entities import Invoice, Payment, SepayTransaction


# Tao payment moi. Khong commit ngay, giu trong cung transaction voi invoice va
# cap nhat trang thai booking. gateway_response de trong nghia la thanh toan
# mock; luong SePay truyen vao payload that cua ngan hang.
def create_payment_record(
    db: Session,
    *,
    booking_id: int,
    amount: float,
    payment_method: PaymentMethod,
    transaction_id: str,
    gateway_response: dict | None = None,
    paid_at: datetime | None = None,
) -> Payment:
    payment = Payment(
        booking_id=booking_id,
        amount=amount,
        payment_method=payment_method,
        payment_status=PaymentStatus.COMPLETED,
        transaction_id=transaction_id,
        payment_gateway_response=gateway_response
        or {"mock": True, "provider": payment_method.value},
        paid_at=paid_at or datetime.now(timezone.utc),
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
    buyer_name: str,
    buyer_email: str,
    buyer_phone: str | None,
    seller_name: str,
    seller_address: str,
    seller_phone: str | None,
    seller_email: str | None,
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
        buyer_name=buyer_name,
        buyer_email=buyer_email,
        buyer_phone=buyer_phone,
        seller_name=seller_name,
        seller_address=seller_address,
        seller_phone=seller_phone,
        seller_email=seller_email,
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


# Ghi nhat ky 1 giao dich SePay. Khong commit ngay. Nem IntegrityError khi
# sepay_id da ton tai - do la co che chong trung, khong phai loi bat thuong.
def create_sepay_transaction_record(
    db: Session,
    *,
    sepay_id: int,
    payment_code: str | None,
    transfer_amount: int,
    gateway: str,
    account_number: str,
    content: str,
    reference_code: str | None,
    transaction_date: datetime,
    raw_payload: dict,
) -> SepayTransaction:
    transaction = SepayTransaction(
        sepay_id=sepay_id,
        payment_code=payment_code,
        transfer_amount=transfer_amount,
        gateway=gateway,
        account_number=account_number,
        content=content,
        reference_code=reference_code,
        transaction_date=transaction_date,
        raw_payload=raw_payload,
    )
    db.add(transaction)
    db.flush()
    return transaction


# Kiem tra 1 giao dich SePay da duoc ghi nhan chua.
def sepay_transaction_exists(db: Session, sepay_id: int) -> bool:
    return db.query(SepayTransaction.id).filter(SepayTransaction.sepay_id == sepay_id).first() is not None


# Danh sach giao dich SePay cho man hinh doi soat, loc theo trang thai neu co.
def list_sepay_transactions(db: Session, status_filter: str | None = None) -> list[SepayTransaction]:
    query = db.query(SepayTransaction)
    if status_filter:
        query = query.filter(SepayTransaction.status == status_filter)
    return query.order_by(SepayTransaction.transaction_date.desc()).all()
