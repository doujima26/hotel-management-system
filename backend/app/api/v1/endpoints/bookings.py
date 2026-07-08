from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.bookings import CreateBookingRequest
from app.services.booking_service import (
    create_booking as create_booking_action,
    get_booking_detail as get_booking_detail_action,
    list_my_bookings as list_my_bookings_action,
)
from app.services.payment_service import get_invoice_by_booking as get_invoice_by_booking_action

router = APIRouter(prefix="/bookings", tags=["bookings"])


# Khach tao booking moi.
@router.post("")
def create_booking(
    payload: CreateBookingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = create_booking_action(db, current_user, payload)
    return ok(data, "Tao booking thanh cong")


# Khach xem danh sach booking cua minh.
@router.get("")
def list_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = list_my_bookings_action(db, current_user)
    return ok(data, "Danh sach booking")


# Khach xem chi tiet 1 booking cua minh.
@router.get("/{booking_id}")
def get_booking_detail(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = get_booking_detail_action(db, current_user, booking_id)
    return ok(data, "Chi tiet booking")


# Khach xem hoa don cua booking minh.
@router.get("/{booking_id}/invoice")
def get_booking_invoice(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = get_invoice_by_booking_action(db, current_user, booking_id)
    return ok(data, "Hoa don booking")
