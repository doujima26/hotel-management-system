import secrets
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, PaymentMethod
from app.models.entities import Booking, Invoice, Payment, User
from app.repositories.booking_repository import (
    UNPAID_HOLD_MINUTES,
    get_booking_by_id,
    get_booking_by_id_for_update,
    is_hold_expired,
)
from app.repositories.hotel_repository import get_hotel_by_id
from app.repositories.payment_repository import (
    create_invoice_record,
    create_payment_record,
    get_invoice_by_booking_id,
    get_payment_by_booking_id,
    get_payment_by_id,
)
from app.schemas.payments import InvoiceResponse, PayBookingRequest, PayBookingResponse, PaymentResponse


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
    db: Session, booking: Booking, buyer: User, payment_method: PaymentMethod
) -> tuple[Payment, Invoice]:
    hotel = get_hotel_by_id(db, booking.hotel_id)
    seller_address = hotel.address
    if hotel.district:
        seller_address = f"{seller_address}, {hotel.district}"
    seller_address = f"{seller_address}, {hotel.city}"

    payment = create_payment_record(
        db,
        booking_id=booking.id,
        amount=float(booking.total_amount),
        payment_method=payment_method,
        transaction_id=_generate_transaction_id(),
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


def pay_booking(db: Session, current_user: User, payload: PayBookingRequest) -> dict:
    booking = get_booking_by_id_for_update(db, payload.booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking khong ton tai",
        )
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban chi duoc thanh toan booking cua minh",
        )
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking khong con hop le de thanh toan",
        )
    # Booking van giu PENDING sau khi thanh toan (cho Admin xac nhan), nen phai
    # kiem tra rieng da co Payment chua, khong the chi dua vao booking.status.
    if get_payment_by_booking_id(db, booking.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking da duoc thanh toan",
        )
    # Qua han giu cho thi phong da duoc nha ra ban lai, cho thanh toan tiep se
    # dan den ban trung 1 phong cho 2 khach.
    if is_hold_expired(booking, None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Don da qua han giu cho {UNPAID_HOLD_MINUTES} phut, vui long dat lai",
        )

    try:
        payment, invoice = build_payment_with_invoice(db, booking, current_user, payload.payment_method)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Khong the tao thanh toan, vui long thu lai",
        ) from exc

    db.refresh(payment)
    db.refresh(invoice)

    return PayBookingResponse(
        payment=PaymentResponse.model_validate(payment),
        invoice=InvoiceResponse.model_validate(invoice),
    ).model_dump(mode="json")


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
