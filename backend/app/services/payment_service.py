import logging
import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import ROUND_CEILING, Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import BookingStatus, PaymentMethod
from app.models.entities import Booking, Invoice, Payment, User
from app.repositories.booking_repository import get_booking_by_code_for_update, get_booking_by_id
from app.repositories.hotel_repository import get_hotel_by_id
from app.repositories.payment_repository import (
    create_invoice_record,
    create_payment_record,
    create_sepay_transaction_record,
    get_invoice_by_booking_id,
    get_payment_by_booking_id,
    get_payment_by_id,
    sepay_transaction_exists,
)
from app.repositories.user_repository import get_user_by_id
from app.schemas.payments import InvoiceResponse, PaymentResponse, SepayWebhookPayload

logger = logging.getLogger(__name__)

# Mui gio SePay dung cho truong transactionDate (gio Viet Nam).
_SEPAY_TIMEZONE = timezone(timedelta(hours=7))


# Sinh ma hoa don dang INV-YYYYMMDD-xxxxxx.
def _generate_invoice_number() -> str:
    today = date.today()
    suffix = f"{secrets.randbelow(1_000_000):06d}"
    return f"INV-{today:%Y%m%d}-{suffix}"


# Sinh ma giao dich mock.
def _generate_transaction_id() -> str:
    return f"MOCK-{secrets.token_hex(8)}"


# Xu ly thanh toan mock cho 1 booking, tao kem hoa don. Booking van giu PENDING
# cho den khi Admin xac nhan hoa don (booking_service.confirm_booking).
# Ghi thanh toan va phat hanh hoa don cho 1 booking trong session hien tai
# nhung KHONG commit - de nguoi goi quyet dinh chot giao dich luc nao. Dung
# chung cho thanh toan don le va cho luong dat phong gop 1 giao dich.
def build_payment_with_invoice(
    db: Session,
    booking: Booking,
    buyer: User,
    payment_method: PaymentMethod,
    *,
    transaction_id: str | None = None,
    gateway_response: dict | None = None,
    paid_at: datetime | None = None,
    amount: float | None = None,
) -> tuple[Payment, Invoice]:
    hotel = get_hotel_by_id(db, booking.hotel_id)
    seller_address = hotel.address
    if hotel.district:
        seller_address = f"{seller_address}, {hotel.district}"
    seller_address = f"{seller_address}, {hotel.city}"

    payment = create_payment_record(
        db,
        booking_id=booking.id,
        # Luong SePay ghi so tien khach chuyen that (co the thua); luong mock ghi
        # dung so tien cua don.
        amount=amount if amount is not None else float(booking.total_amount),
        payment_method=payment_method,
        transaction_id=transaction_id or _generate_transaction_id(),
        gateway_response=gateway_response,
        paid_at=paid_at,
    )

    invoice = create_invoice_record(
        db,
        invoice_number=_generate_invoice_number(),
        booking_id=booking.id,
        payment_id=payment.id,
        user_id=booking.user_id,
        hotel_id=booking.hotel_id,
        buyer_name=buyer.full_name,
        buyer_email=buyer.email,
        buyer_phone=buyer.phone,
        seller_name=hotel.name,
        seller_address=seller_address,
        seller_phone=hotel.phone,
        seller_email=hotel.email,
        total_room_price=float(booking.total_room_price),
        total_service_price=float(booking.total_service_price),
        discount_amount=float(booking.discount_amount),
        total_amount=float(booking.total_amount),
    )

    return payment, invoice


# ===== Webhook SePay =====


# Doi chuoi "YYYY-MM-DD HH:mm:ss" gio Viet Nam tu SePay thanh datetime co mui gio.
def _doi_thoi_diem_giao_dich(gia_tri: str) -> datetime:
    return datetime.strptime(gia_tri, "%Y-%m-%d %H:%M:%S").replace(tzinfo=_SEPAY_TIMEZONE)


# Kiem tra don da qua han giu cho chua. Chi don cho chuyen khoan moi co han giu
# cho: cac phuong thuc mock tra tien ngay luc dat nen khong bao gio roi vao day.
def _het_han_giu_cho(booking: Booking) -> bool:
    moc = datetime.now(timezone.utc) - timedelta(minutes=settings.sepay_hold_minutes)
    return booking.created_at < moc


# Tim don ung voi ma thanh toan va kiem tra du dieu kien ghi nhan thanh toan.
# Tra ve (don, ly do tu choi). Don khac None nghia la khop duoc.
def _tim_don_khop(db: Session, payload: SepayWebhookPayload) -> tuple[Booking | None, str]:
    if not payload.code:
        return None, "Noi dung chuyen khoan khong chua ma thanh toan"

    # Khoa don lai: 2 goi tin cua cung 1 don toi cung luc phai xep hang, khong
    # cung ghi 2 thanh toan cho 1 don.
    booking = get_booking_by_code_for_update(db, payload.code)
    if not booking:
        return None, f"Khong tim thay don {payload.code}"
    if booking.status != BookingStatus.PENDING:
        return None, f"Don {payload.code} dang o trang thai {booking.status.value}"
    if get_payment_by_booking_id(db, booking.id):
        return None, f"Don {payload.code} da co thanh toan"
    if _het_han_giu_cho(booking):
        return None, f"Don {payload.code} da qua han giu cho {settings.sepay_hold_minutes} phut"

    # Lam tron len den dong de khong tu choi vi phan le duoi 1 dong.
    can_tra = int(Decimal(booking.total_amount).quantize(Decimal(1), rounding=ROUND_CEILING))
    if payload.transfer_amount < can_tra:
        return None, f"Chuyen thieu: can {can_tra}, nhan {payload.transfer_amount}"

    return booking, ""


# Xu ly 1 webhook bao co tien vao tu SePay: ghi nhat ky giao dich, khop ve don
# va phat hanh thanh toan + hoa don neu du dieu kien.
#
# Ham nay KHONG nem loi khi khong khop duoc don. Tien da vao tai khoan thi
# khong tra lai duoc bang cach bao loi cho SePay - bao loi chi khien SePay gui
# lai 7 lan roi van khong khop. Thay vao do giao dich duoc luu voi trang thai
# unmatched kem ly do, de nguoi van hanh doi soat va hoan tien.
def handle_sepay_webhook(db: Session, payload: SepayWebhookPayload, raw_payload: dict) -> dict:
    if payload.transfer_type != "in":
        return {"success": True, "note": "Bo qua giao dich tien ra"}

    # Chan som truong hop pho bien nhat de khoi mo transaction vo ich.
    if sepay_transaction_exists(db, payload.id):
        return {"success": True, "note": "Giao dich da duoc xu ly truoc do"}

    try:
        transaction = create_sepay_transaction_record(
            db,
            sepay_id=payload.id,
            payment_code=payload.code,
            transfer_amount=payload.transfer_amount,
            gateway=payload.gateway,
            account_number=payload.account_number,
            content=payload.content,
            reference_code=payload.reference_code,
            transaction_date=_doi_thoi_diem_giao_dich(payload.transaction_date),
            raw_payload=raw_payload,
        )
    except IntegrityError:
        # 2 goi tin cua cung 1 giao dich toi cung luc: goi thua bi khoa UNIQUE
        # chan lai. Day la co che chong trung hoat dong dung, khong phai loi.
        db.rollback()
        return {"success": True, "note": "Giao dich da duoc xu ly truoc do"}

    booking, ly_do = _tim_don_khop(db, payload)
    if not booking:
        transaction.status = "unmatched"
        transaction.note = ly_do
        db.add(transaction)
        db.commit()
        logger.warning("Giao dich SePay %s khong khop duoc don: %s", payload.id, ly_do)
        return {"success": True, "note": ly_do}

    buyer = get_user_by_id(db, booking.user_id)
    payment, _invoice = build_payment_with_invoice(
        db,
        booking,
        buyer,
        PaymentMethod.BANK_TRANSFER,
        transaction_id=str(payload.id),
        gateway_response=raw_payload,
        paid_at=_doi_thoi_diem_giao_dich(payload.transaction_date),
        amount=float(payload.transfer_amount),
    )

    transaction.status = "matched"
    transaction.booking_id = booking.id
    transaction.payment_id = payment.id
    db.add(transaction)
    db.commit()

    logger.info("Giao dich SePay %s da khop don %s", payload.id, booking.booking_code)
    return {"success": True, "booking_code": booking.booking_code}


# Xu ly lay chi tiet 1 payment, chi cho chinh chu booking xem.
def get_payment_detail(db: Session, current_user: User, payment_id: int) -> dict:
    payment = get_payment_by_id(db, payment_id)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thanh toan khong ton tai",
        )

    booking = get_booking_by_id(db, payment.booking_id)
    if not booking or booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc xem thanh toan cua minh",
        )

    return PaymentResponse.model_validate(payment).model_dump(mode="json")


# Xu ly lay hoa don theo booking, chi cho chinh chu booking xem.
def get_invoice_by_booking(db: Session, current_user: User, booking_id: int) -> dict:
    booking = get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking khong ton tai",
        )
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc xem hoa don cua minh",
        )

    invoice = get_invoice_by_booking_id(db, booking_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking chua co hoa don",
        )

    return InvoiceResponse.model_validate(invoice).model_dump(mode="json")
