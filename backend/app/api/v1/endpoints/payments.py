from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.core.response import ok
from app.db.session import get_db
from app.models.entities import User
from app.schemas.payments import PayBookingRequest
from app.services.payment_service import (
    get_payment_detail as get_payment_detail_action,
    pay_booking as pay_booking_action,
)

router = APIRouter(prefix="/payments", tags=["payments"])


# Khach thanh toan mock cho booking cua minh.
@router.post("")
def pay_booking(
    payload: PayBookingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = pay_booking_action(db, current_user, payload)
    return ok(data, "Thanh toan thanh cong")


# Khach xem chi tiet 1 thanh toan cua minh.
@router.get("/{payment_id}")
def get_payment_detail(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.USER)),
):
    data = get_payment_detail_action(db, current_user, payment_id)
    return ok(data, "Chi tiet thanh toan")
